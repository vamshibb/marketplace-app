import { ListingType, PaymentPurpose, PaymentStatus, PaymentWebhookEventStatus, Prisma } from "../generated/prisma";
import { AppError } from "../errors/AppError";
import * as orderRepository from "../repositories/order.repository";
import * as paymentRepository from "../repositories/payment.repository";
import type {
    PaymentProvider,
    PaymentProviderRequest,
    PaymentProviderResult,
    VerifiedPaymentWebhookEvent,
} from "./paymentProvider";
import { getConfiguredPaymentProvider } from "./paymentProvider";

export type PaymentAmountInput = string | Prisma.Decimal;
export type PaymentMetadataObject = Prisma.InputJsonObject;
export type PaymentMetadataRead = Prisma.JsonValue | null | undefined;
export type PaymentMetadataWrite = Prisma.PaymentUncheckedUpdateInput["metadata"];

export interface PaymentOperationOptions {
    metadata?: PaymentMetadataObject | null;
    operationIdempotencyKey?: string;
}

export interface CreatePaymentInput {
    orderId: string;
    purpose: PaymentPurpose;
    amount: PaymentAmountInput;
    currency: string;
    idempotencyKey?: string;
    metadata?: PaymentMetadataObject | null;
}

const allowedPaymentPurposesByOrderType: Record<ListingType, PaymentPurpose[]> = {
    SALE: [PaymentPurpose.SALE],
    RENT: [PaymentPurpose.RENT, PaymentPurpose.RENT_DEPOSIT],
};

const VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
    [PaymentStatus.PENDING]: [
        PaymentStatus.PROCESSING,
        PaymentStatus.AUTHORIZED,
        PaymentStatus.CAPTURED,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
    ],
    [PaymentStatus.PROCESSING]: [
        PaymentStatus.AUTHORIZED,
        PaymentStatus.CAPTURED,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
    ],
    [PaymentStatus.AUTHORIZED]: [
        PaymentStatus.CAPTURED,
        PaymentStatus.CANCELLED,
        PaymentStatus.FAILED,
    ],
    [PaymentStatus.CAPTURED]: [
        PaymentStatus.PARTIALLY_REFUNDED,
        PaymentStatus.REFUNDED,
    ],
    [PaymentStatus.PARTIALLY_REFUNDED]: [
        PaymentStatus.PARTIALLY_REFUNDED,
        PaymentStatus.REFUNDED,
    ],
    [PaymentStatus.FAILED]: [],
    [PaymentStatus.CANCELLED]: [],
    [PaymentStatus.REFUNDED]: [],
};

const normalizeCurrency = (currency: string): string => {
    const normalized = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
        throw new AppError("A three-letter ISO currency code is required.", 400);
    }
    return normalized;
};

const normalizeAmount = (amount: PaymentAmountInput): Prisma.Decimal => {
    const raw = typeof amount === "string" ? amount.trim() : amount.toString();
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
        throw new AppError(
            "Payment amount must be a positive decimal value with up to 2 fractional digits.",
            400
        );
    }

    const decimalAmount = new Prisma.Decimal(raw);
    if (decimalAmount.lte(0)) {
        throw new AppError("Payment amount must be greater than zero.", 400);
    }

    return decimalAmount;
};

const buildIdempotencyKey = (
    orderId: string,
    purpose: PaymentPurpose,
    idempotencyKey?: string
): string => idempotencyKey?.trim() || `${orderId}:${purpose}`;

const validateStatusTransition = (currentStatus: PaymentStatus, nextStatus: PaymentStatus): void => {
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
        throw new AppError(
            `Payment status transition ${currentStatus} -> ${nextStatus} is not allowed.`,
            409
        );
    }
};

const ensureProviderIdentityConsistency = (
    payment: { provider: string | null; providerPaymentId: string | null },
    providerResult: PaymentProviderResult,
    operation: string
): void => {
    if (payment.provider && providerResult.provider && payment.provider !== providerResult.provider) {
        throw new AppError(`Payment provider identity changed during ${operation}.`, 409);
    }

    if (
        payment.providerPaymentId &&
        providerResult.providerPaymentId &&
        payment.providerPaymentId !== providerResult.providerPaymentId
    ) {
        throw new AppError(`Payment provider reference changed during ${operation}.`, 409);
    }
};

const ensureAuthorizeResultIsPersistable = (providerResult: PaymentProviderResult): void => {
    if (!providerResult.provider || !providerResult.provider.trim()) {
        throw new AppError("Payment provider identity is required for a successful authorization.", 409);
    }

    if (!providerResult.providerPaymentId || !providerResult.providerPaymentId.trim()) {
        throw new AppError("Payment provider reference is required for a successful authorization.", 409);
    }
};

const buildProviderOperationIdempotencyKey = (
    payment: { idempotencyKey: string },
    operation: "authorize" | "capture" | "cancel"
): string => `${payment.idempotencyKey}:${operation}`;

const buildProviderRequest = (
    payment: {
        orderId: string;
        purpose: PaymentPurpose;
        amount: Prisma.Decimal;
        currency: string;
        idempotencyKey: string;
        providerPaymentId: string | null;
        metadata: PaymentMetadataRead;
    },
    operation: "authorize" | "capture" | "cancel" | "refund",
    operationOptions?: PaymentOperationOptions
): PaymentProviderRequest => ({
    orderId: payment.orderId,
    purpose: payment.purpose,
    amount: payment.amount,
    currency: payment.currency,
    idempotencyKey: payment.idempotencyKey,
    operationIdempotencyKey:
        operation === "refund"
            ? operationOptions?.operationIdempotencyKey ?? undefined
            : buildProviderOperationIdempotencyKey(payment, operation),
    providerPaymentId: payment.providerPaymentId,
    metadata: mergeMetadata(payment.metadata, operationOptions?.metadata),
});

const resolveWebhookPayment = async (
    provider: string,
    verifiedEvent: VerifiedPaymentWebhookEvent
) => {
    if (!verifiedEvent.providerPaymentId || !verifiedEvent.providerPaymentId.trim()) {
        return null;
    }

    return paymentRepository.findPaymentByProviderReference(provider, verifiedEvent.providerPaymentId.trim());
};

export const processWebhookEvent = async (
    providerName: string,
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined> = {},
    paymentProvider: PaymentProvider = getConfiguredPaymentProvider()
) => {
    const selectedProviderName = providerName.trim();
    if (!selectedProviderName) {
        throw new AppError("Provider name is required.", 400);
    }

    const configuredProviderName = paymentProvider.name.trim();
    if (selectedProviderName.toLowerCase() !== configuredProviderName.toLowerCase()) {
        throw new AppError(`Provider "${selectedProviderName}" is not configured for this environment.`, 404);
    }

    const canonicalProviderName = configuredProviderName;
    const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
    const verifiedEvent = await paymentProvider.verifyWebhook(rawBuffer, headers);

    if (!verifiedEvent.provider || verifiedEvent.provider.trim().length === 0) {
        throw new AppError("Verified webhook event is missing a provider identity.", 400);
    }

    if (verifiedEvent.provider.trim().toLowerCase() !== canonicalProviderName.toLowerCase()) {
        throw new AppError(
            `Verified webhook provider "${verifiedEvent.provider}" does not match the configured adapter "${canonicalProviderName}".`,
            409
        );
    }

    if (!verifiedEvent.providerEventId || !verifiedEvent.providerEventId.trim()) {
        throw new AppError("Webhook payload is missing an event identifier.", 400);
    }

    const providerEventId = verifiedEvent.providerEventId.trim();
    const claimResult = await paymentRepository.claimWebhookEvent(canonicalProviderName, providerEventId, {
        eventType: verifiedEvent.eventType,
        providerPaymentId: verifiedEvent.providerPaymentId ?? null,
        occurredAt: verifiedEvent.occurredAt ?? null,
    });
    const eventRecord = claimResult.event;

    if (claimResult.state === "busy") {
        return {
            acknowledged: false,
            retryable: true,
            idempotent: true,
            event: eventRecord,
            payment: eventRecord.paymentId ? await paymentRepository.findPaymentById(eventRecord.paymentId) : null,
        };
    }

    if (claimResult.state === "duplicate") {
        return {
            acknowledged: true,
            idempotent: true,
            event: eventRecord,
            payment: eventRecord.paymentId ? await paymentRepository.findPaymentById(eventRecord.paymentId) : null,
        };
    }

    if (claimResult.state === "retry") {
        return {
            acknowledged: false,
            retryable: true,
            idempotent: false,
            event: eventRecord,
            payment: eventRecord.paymentId ? await paymentRepository.findPaymentById(eventRecord.paymentId) : null,
        };
    }

    if (!verifiedEvent.providerPaymentId || !verifiedEvent.providerPaymentId.trim()) {
        const retryableEvent = await paymentRepository.updateWebhookEventStatus(
            eventRecord.id,
            {
                status: PaymentWebhookEventStatus.FAILED,
                paymentId: eventRecord.paymentId ?? null,
                providerPaymentId: null,
                reason: "Verified webhook event did not include a providerPaymentId; retry is required.",
                processedAt: new Date(),
            },
            { expectedStatus: [PaymentWebhookEventStatus.PROCESSING, PaymentWebhookEventStatus.FAILED] }
        );

        return {
            acknowledged: false,
            retryable: true,
            idempotent: false,
            event: retryableEvent,
            payment: eventRecord.paymentId ? await paymentRepository.findPaymentById(eventRecord.paymentId) : null,
        };
    }

    const canonicalProviderPaymentId = verifiedEvent.providerPaymentId.trim();
    const resolvedPayment = await resolveWebhookPayment(canonicalProviderName, verifiedEvent);
    if (!resolvedPayment) {
        const retryableEvent = await paymentRepository.updateWebhookEventStatus(
            eventRecord.id,
            {
                status: PaymentWebhookEventStatus.FAILED,
                paymentId: eventRecord.paymentId ?? null,
                providerPaymentId: canonicalProviderPaymentId,
                reason: "Verified provider payment reference did not resolve to a local payment yet; retry is required.",
                processedAt: new Date(),
            },
            { expectedStatus: [PaymentWebhookEventStatus.PROCESSING, PaymentWebhookEventStatus.FAILED] }
        );

        return {
            acknowledged: false,
            retryable: true,
            idempotent: false,
            event: retryableEvent,
            payment: null,
        };
    }

    if (verifiedEvent.paymentStatus === null || verifiedEvent.paymentStatus === undefined) {
        const retryableEvent = await paymentRepository.updateWebhookEventStatus(
            eventRecord.id,
            {
                status: PaymentWebhookEventStatus.FAILED,
                paymentId: resolvedPayment.id,
                providerPaymentId: canonicalProviderPaymentId,
                reason: "Verified webhook event did not include an actionable payment status; retry is required.",
                processedAt: new Date(),
            },
            { expectedStatus: [PaymentWebhookEventStatus.PROCESSING, PaymentWebhookEventStatus.FAILED] }
        );

        return {
            acknowledged: false,
            retryable: true,
            idempotent: false,
            event: retryableEvent,
            payment: resolvedPayment,
        };
    }

    if (resolvedPayment.provider && resolvedPayment.provider !== canonicalProviderName) {
        throw new AppError("Webhook payment provider identity does not match the local payment record.", 409);
    }

    if (resolvedPayment.providerPaymentId && resolvedPayment.providerPaymentId !== canonicalProviderPaymentId) {
        throw new AppError("Webhook provider payment reference does not match the local payment record.", 409);
    }

    if (verifiedEvent.paymentStatus === resolvedPayment.status) {
        const processed = await paymentRepository.finalizeWebhookTransition(eventRecord.id, resolvedPayment.id, {
            paymentStatus: resolvedPayment.status,
            finalEventStatus: PaymentWebhookEventStatus.PROCESSED,
            provider: canonicalProviderName,
            providerPaymentId: canonicalProviderPaymentId,
            reason: "Webhook status already matched the persisted payment status; no mutation was required.",
            metadata: {
                provider: canonicalProviderName,
                providerEventId,
                eventType: verifiedEvent.eventType,
            } as PaymentMetadataObject as Prisma.PaymentUncheckedUpdateInput["metadata"],
        });

        return {
            acknowledged: true,
            idempotent: false,
            event: processed.event,
            payment: processed.payment,
        };
    }

    const allowedTransition = VALID_TRANSITIONS[resolvedPayment.status] ?? [];
    if (!allowedTransition.includes(verifiedEvent.paymentStatus)) {
        const ignored = await paymentRepository.finalizeWebhookTransition(eventRecord.id, resolvedPayment.id, {
            paymentStatus: resolvedPayment.status,
            finalEventStatus: PaymentWebhookEventStatus.IGNORED,
            provider: canonicalProviderName,
            providerPaymentId: canonicalProviderPaymentId,
            reason: `Webhook payment status ${verifiedEvent.paymentStatus} is stale or out of order for payment status ${resolvedPayment.status}.`,
            metadata: {
                provider: canonicalProviderName,
                providerEventId,
                eventType: verifiedEvent.eventType,
            } as PaymentMetadataObject as Prisma.PaymentUncheckedUpdateInput["metadata"],
        });

        return {
            acknowledged: true,
            idempotent: false,
            event: ignored.event,
            payment: ignored.payment,
        };
    }

    try {
        validateStatusTransition(resolvedPayment.status, verifiedEvent.paymentStatus);

        const processed = await paymentRepository.finalizeWebhookTransition(eventRecord.id, resolvedPayment.id, {
            paymentStatus: verifiedEvent.paymentStatus,
            finalEventStatus: PaymentWebhookEventStatus.PROCESSED,
            provider: canonicalProviderName,
            providerPaymentId: canonicalProviderPaymentId,
            reason: null,
            metadata: mergeMetadata(resolvedPayment.metadata, {
                provider: canonicalProviderName,
                providerEventId,
                eventType: verifiedEvent.eventType,
            } as PaymentMetadataObject) as Prisma.PaymentUncheckedUpdateInput["metadata"],
        });

        return {
            acknowledged: true,
            idempotent: false,
            event: processed.event,
            payment: processed.payment,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Webhook processing failed.";
        const failed = await paymentRepository.finalizeWebhookTransition(eventRecord.id, resolvedPayment.id, {
            paymentStatus: resolvedPayment.status,
            finalEventStatus: PaymentWebhookEventStatus.FAILED,
            provider: canonicalProviderName,
            providerPaymentId: canonicalProviderPaymentId,
            reason: message,
            metadata: {
                provider: canonicalProviderName,
                providerEventId,
                eventType: verifiedEvent.eventType,
            } as PaymentMetadataObject as Prisma.PaymentUncheckedUpdateInput["metadata"],
        });

        if (error instanceof AppError) {
            return {
                acknowledged: false,
                retryable: true,
                idempotent: false,
                event: failed.event,
                payment: failed.payment,
            };
        }

        throw error;
    }
};

export const getPaymentById = async (id: string) => paymentRepository.findPaymentById(id);

export const getPaymentsByOrderId = async (orderId: string) =>
    paymentRepository.findPaymentsByOrderId(orderId);

export const getPaymentByOrderAndPurpose = async (orderId: string, purpose: PaymentPurpose) =>
    paymentRepository.findPaymentByOrderAndPurpose(orderId, purpose);

const requireRentalDepositForOrder = async (orderId: string) => {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
        throw new AppError("Order not found", 404);
    }

    if (order.transactionType !== ListingType.RENT) {
        throw new AppError("Rental deposit operations are only valid for RENT orders.", 409);
    }

    const deposit = await paymentRepository.findPaymentByOrderAndPurpose(orderId, PaymentPurpose.RENT_DEPOSIT);
    if (!deposit) {
        throw new AppError(`Order ${orderId} does not have a RENT_DEPOSIT payment record.`, 409);
    }

    return deposit;
};

export const requirePaymentRecord = async (id: string) => {
    const payment = await paymentRepository.findPaymentById(id);
    if (!payment) {
        throw new AppError("Payment not found", 404);
    }
    return payment;
};

const asPaymentMetadataObject = (value: PaymentMetadataRead): PaymentMetadataObject | null => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    return value as PaymentMetadataObject;
};

const mergeMetadata = (
    base: PaymentMetadataRead,
    incoming: PaymentMetadataObject | null | undefined
): PaymentMetadataObject | null | undefined => {
    const baseObject = asPaymentMetadataObject(base);
    const incomingObject = incoming && Object.keys(incoming).length > 0 ? incoming : null;

    if (!baseObject && !incomingObject) {
        return null;
    }

    return {
        ...(baseObject ?? {}),
        ...(incomingObject ?? {}),
    };
};

const updatePaymentWithTransition = async (
    paymentId: string,
    nextStatus: PaymentStatus,
    operationMetadata?: PaymentMetadataObject | null,
    providerData?: Partial<{
        provider: string | null;
        providerPaymentId: string | null;
        metadata: PaymentMetadataWrite;
    }>
) => {
    const payment = await requirePaymentRecord(paymentId);
    validateStatusTransition(payment.status, nextStatus);

    const mergedMetadata = mergeMetadata(payment.metadata, operationMetadata);
    const metadataValue = mergedMetadata === undefined ? undefined : mergedMetadata ?? Prisma.DbNull;

    try {
        return await paymentRepository.updatePaymentStatus(payment.id, nextStatus, {
            provider: providerData?.provider ?? payment.provider,
            providerPaymentId: providerData?.providerPaymentId ?? payment.providerPaymentId,
            metadata: providerData?.metadata ?? metadataValue,
        });
    } catch (error: any) {
        if (error?.code === "P2002") {
            throw new AppError("A payment with the same provider transaction identity already exists.", 409);
        }

        throw error;
    }
};

export const authorizeOrderPayment = async (
    orderId: string,
    buyerId: string,
    paymentProvider: PaymentProvider = getConfiguredPaymentProvider()
) => {
    const order = await orderRepository.findOrderById(orderId);

    if (!order) {
        throw new AppError("Order not found", 404);
    }

    if (order.buyerId !== buyerId) {
        throw new AppError(
            "You are not authorized to perform this action.",
            403
        );
    }

    const purpose =
        order.transactionType === ListingType.SALE
            ? PaymentPurpose.SALE
            : order.transactionType === ListingType.RENT
              ? PaymentPurpose.RENT
              : null;

    if (!purpose) {
        throw new AppError(
            `Unsupported order transaction type: ${order.transactionType}.`,
            409
        );
    }

    const payment = await createPaymentRecord({
        orderId: order.id,
        purpose,
        amount: order.subtotal,
        currency: order.currency,
        idempotencyKey: `${order.id}:${purpose}`,
    });

    if (
        payment.status === PaymentStatus.AUTHORIZED ||
        payment.status === PaymentStatus.CAPTURED
    ) {
        return payment;
    }

    if (payment.status !== PaymentStatus.PENDING) {
        throw new AppError(
            `${purpose} payment cannot be authorized from status ${payment.status}.`,
            409
        );
    }

    return authorizePayment(
        payment.id,
        paymentProvider
    );
};

export const createPaymentRecord = async ({
    orderId,
    purpose,
    amount,
    currency,
    idempotencyKey,
    metadata,
}: CreatePaymentInput) => {
    if (!orderId.trim()) {
        throw new AppError("Order ID is required.", 400);
    }

    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
        throw new AppError("Order not found", 404);
    }

    const allowedPurposes = allowedPaymentPurposesByOrderType[order.transactionType];
    if (!allowedPurposes || !allowedPurposes.includes(purpose)) {
        throw new AppError(
            `Payment purpose ${purpose} is not allowed for ${order.transactionType} orders.`,
            400
        );
    }

    const normalizedAmount = normalizeAmount(amount);
    const normalizedCurrency = normalizeCurrency(currency);
    const resolvedIdempotencyKey = buildIdempotencyKey(orderId, purpose, idempotencyKey);

    const existingPayment = await paymentRepository.findPaymentByOrderAndPurpose(orderId, purpose);
    if (existingPayment) {
        if (existingPayment.idempotencyKey !== resolvedIdempotencyKey) {
            throw new AppError(
                "A payment already exists for this order and purpose with a different idempotency key.",
                409
            );
        }

        if (!existingPayment.amount.equals(normalizedAmount) || existingPayment.currency !== normalizedCurrency) {
            throw new AppError(
                "A payment already exists for this order and purpose with conflicting financial details.",
                409
            );
        }

        return existingPayment;
    }

    const duplicateByIdempotency = await paymentRepository.findPaymentByIdempotencyKey(resolvedIdempotencyKey);
    if (duplicateByIdempotency) {
        if (duplicateByIdempotency.orderId !== orderId || duplicateByIdempotency.purpose !== purpose) {
            throw new AppError("A payment with this idempotency key already exists.", 409);
        }

        if (!duplicateByIdempotency.amount.equals(normalizedAmount) || duplicateByIdempotency.currency !== normalizedCurrency) {
            throw new AppError("This idempotency key is already in use for a different financial operation.", 409);
        }

        return duplicateByIdempotency;
    }

    try {
        return await paymentRepository.createPayment({
            orderId,
            purpose,
            provider: null,
            providerPaymentId: null,
            amount: normalizedAmount,
            currency: normalizedCurrency,
            status: PaymentStatus.PENDING,
            idempotencyKey: resolvedIdempotencyKey,
            metadata: metadata === undefined ? Prisma.DbNull : metadata ?? Prisma.DbNull,
        });
    } catch (error) {
        const prismaError = error as { code?: string; meta?: { target?: string[] } };
        if (prismaError?.code !== "P2002") {
            throw error;
        }

        const existingByOrderAndPurpose = await paymentRepository.findPaymentByOrderAndPurpose(orderId, purpose);
        if (existingByOrderAndPurpose) {
            if (
                existingByOrderAndPurpose.idempotencyKey === resolvedIdempotencyKey &&
                existingByOrderAndPurpose.amount.equals(normalizedAmount) &&
                existingByOrderAndPurpose.currency === normalizedCurrency
            ) {
                return existingByOrderAndPurpose;
            }

            throw new AppError(
                "A payment already exists for this order and purpose with a different immutable financial operation.",
                409
            );
        }

        const existingByIdempotency = await paymentRepository.findPaymentByIdempotencyKey(resolvedIdempotencyKey);
        if (existingByIdempotency) {
            if (
                existingByIdempotency.orderId === orderId &&
                existingByIdempotency.purpose === purpose &&
                existingByIdempotency.amount.equals(normalizedAmount) &&
                existingByIdempotency.currency === normalizedCurrency
            ) {
                return existingByIdempotency;
            }

            throw new AppError("A payment with this idempotency key already exists for a different financial operation.", 409);
        }

        throw new AppError("This payment creation conflicted with an existing financial record.", 409);
    }
};

export const createPaymentForOrder = createPaymentRecord;

const resolveMainPaymentPurposeForOrder = (transactionType: ListingType): PaymentPurpose => {
    if (transactionType === ListingType.SALE) {
        return PaymentPurpose.SALE;
    }

    if (transactionType === ListingType.RENT) {
        return PaymentPurpose.RENT;
    }

    throw new AppError(`Unsupported order transaction type: ${transactionType}.`, 409);
};

export const getSellerPayoutReadiness = async (orderId: string) => {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
        throw new AppError("Order not found", 404);
    }

    const paymentPurpose = resolveMainPaymentPurposeForOrder(order.transactionType);
    const payment = await paymentRepository.findPaymentByOrderAndPurpose(orderId, paymentPurpose);
    if (!payment) {
        throw new AppError(`Order ${orderId} does not have a ${paymentPurpose} payment record.`, 404);
    }

    const ready = payment.status === PaymentStatus.CAPTURED;

    return {
        orderId: order.id,
        sellerId: order.sellerId,
        paymentId: payment.id,
        grossAmount: payment.amount.toFixed(2),
        currency: payment.currency,
        ready,
    };
};

export const settleCancelledOrderPayment = async (
    orderId: string,
    paymentProvider: PaymentProvider
) => {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
        throw new AppError("Order not found", 404);
    }

    const paymentPurpose = resolveMainPaymentPurposeForOrder(order.transactionType);
    const payment = await paymentRepository.findPaymentByOrderAndPurpose(orderId, paymentPurpose);
    if (!payment) {
        throw new AppError(`Order ${orderId} does not have a ${paymentPurpose} payment record.`, 404);
    }

    if (payment.status === PaymentStatus.CANCELLED || payment.status === PaymentStatus.REFUNDED) {
        return payment;
    }

    if (payment.status === PaymentStatus.AUTHORIZED) {
        return cancelPayment(payment.id, paymentProvider);
    }

    if (payment.status === PaymentStatus.CAPTURED) {
        return refundPayment(payment.id, paymentProvider);
    }

    throw new AppError(
        `Settlement is not allowed for a ${paymentPurpose} payment in status ${payment.status}.`,
        409
    );
};

export const authorizeRentalDeposit = async (
    orderId: string,
    paymentProvider: PaymentProvider
) => {
    const deposit = await requireRentalDepositForOrder(orderId);

    if (deposit.status === PaymentStatus.AUTHORIZED) {
        return deposit;
    }

    if (deposit.status !== PaymentStatus.PENDING) {
        throw new AppError(
            `RENT_DEPOSIT payment cannot be authorized from status ${deposit.status}.`,
            409
        );
    }

    return authorizePayment(deposit.id, paymentProvider);
};

export const releaseRentalDeposit = async (
    orderId: string,
    paymentProvider: PaymentProvider
) => {
    const deposit = await requireRentalDepositForOrder(orderId);

    if (deposit.status === PaymentStatus.CANCELLED) {
        return deposit;
    }

    if (deposit.status === PaymentStatus.CAPTURED) {
        throw new AppError("A captured RENT_DEPOSIT payment cannot be released.", 409);
    }

    if (deposit.status !== PaymentStatus.AUTHORIZED) {
        throw new AppError(
            `RENT_DEPOSIT payment cannot be released from status ${deposit.status}.`,
            409
        );
    }

    return cancelPayment(deposit.id, paymentProvider);
};

export const captureRentalDeposit = async (
    orderId: string,
    paymentProvider: PaymentProvider
) => {
    const deposit = await requireRentalDepositForOrder(orderId);

    if (deposit.status === PaymentStatus.CAPTURED) {
        return deposit;
    }

    if (deposit.status !== PaymentStatus.AUTHORIZED) {
        throw new AppError(
            `RENT_DEPOSIT payment can only be captured from AUTHORIZED; current status is ${deposit.status}.`,
            409
        );
    }

    return capturePayment(deposit.id, paymentProvider);
};

export const authorizePayment = async (
    paymentId: string,
    paymentProvider: PaymentProvider,
    options: PaymentOperationOptions = {}
) => {
    const payment = await requirePaymentRecord(paymentId);
    validateStatusTransition(payment.status, PaymentStatus.AUTHORIZED);

    const providerRequest = buildProviderRequest(payment, "authorize", options);
    const providerResult = await paymentProvider.authorize(providerRequest);

    if (providerResult.status !== PaymentStatus.AUTHORIZED) {
        throw new AppError("Payment provider did not authorize the payment.", 409);
    }

    ensureAuthorizeResultIsPersistable(providerResult);
    ensureProviderIdentityConsistency(payment, providerResult, "authorize");

    return updatePaymentWithTransition(payment.id, PaymentStatus.AUTHORIZED, providerResult.metadata, {
        provider: providerResult.provider ?? payment.provider,
        providerPaymentId: providerResult.providerPaymentId ?? payment.providerPaymentId,
    });
};

export const capturePayment = async (
    paymentId: string,
    paymentProvider: PaymentProvider,
    options: PaymentOperationOptions = {}
) => {
    const payment = await requirePaymentRecord(paymentId);
    if (!payment.providerPaymentId) {
        throw new AppError("Payment is missing providerPaymentId for capture.", 409);
    }

    validateStatusTransition(payment.status, PaymentStatus.CAPTURED);

    const providerRequest = buildProviderRequest(payment, "capture", options);
    const providerResult = await paymentProvider.capture(providerRequest);

    if (providerResult.status !== PaymentStatus.CAPTURED) {
        throw new AppError("Payment provider did not capture the payment.", 409);
    }

    ensureProviderIdentityConsistency(payment, providerResult, "capture");

    return updatePaymentWithTransition(payment.id, PaymentStatus.CAPTURED, providerResult.metadata, {
        provider: providerResult.provider ?? payment.provider,
        providerPaymentId: providerResult.providerPaymentId ?? payment.providerPaymentId,
    });
};

export const cancelPayment = async (
    paymentId: string,
    paymentProvider: PaymentProvider,
    options: PaymentOperationOptions = {}
) => {
    const payment = await requirePaymentRecord(paymentId);
    if (!payment.providerPaymentId) {
        throw new AppError("Payment is missing providerPaymentId for cancellation.", 409);
    }

    validateStatusTransition(payment.status, PaymentStatus.CANCELLED);

    const providerRequest = buildProviderRequest(payment, "cancel", options);
    const providerResult = await paymentProvider.cancel(providerRequest);

    if (providerResult.status !== PaymentStatus.CANCELLED) {
        throw new AppError("Payment provider did not cancel the payment.", 409);
    }

    ensureProviderIdentityConsistency(payment, providerResult, "cancel");

    return updatePaymentWithTransition(payment.id, PaymentStatus.CANCELLED, providerResult.metadata, {
        provider: providerResult.provider ?? payment.provider,
        providerPaymentId: providerResult.providerPaymentId ?? payment.providerPaymentId,
    });
};

export const refundPayment = async (
    paymentId: string,
    paymentProvider: PaymentProvider,
    options: PaymentOperationOptions = {}
) => {
    const payment = await requirePaymentRecord(paymentId);
    if (!payment.providerPaymentId) {
        throw new AppError("Payment is missing providerPaymentId for refund.", 409);
    }

    validateStatusTransition(payment.status, PaymentStatus.REFUNDED);

    const providerRequest = buildProviderRequest(payment, "refund", options);
    const providerResult = await paymentProvider.refund(providerRequest);

    if (providerResult.status !== PaymentStatus.REFUNDED) {
        throw new AppError("Payment provider did not issue a full refund result.", 409);
    }

    ensureProviderIdentityConsistency(payment, providerResult, "refund");

    return updatePaymentWithTransition(payment.id, PaymentStatus.REFUNDED, providerResult.metadata, {
        provider: providerResult.provider ?? payment.provider,
        providerPaymentId: providerResult.providerPaymentId ?? payment.providerPaymentId,
    });
};

export const syncPaymentStatus = async (paymentId: string, paymentProvider: PaymentProvider) => {
    const payment = await requirePaymentRecord(paymentId);
    if (!payment.providerPaymentId) {
        throw new AppError("Payment is missing providerPaymentId for sync.", 409);
    }

    const providerResult = await paymentProvider.getStatus(payment.providerPaymentId, payment.orderId);

    ensureProviderIdentityConsistency(payment, providerResult, "sync");

    if (providerResult.status === payment.status) {
        return paymentRepository.updatePaymentStatus(payment.id, payment.status, {
            provider: providerResult.provider ?? payment.provider,
            providerPaymentId: providerResult.providerPaymentId ?? payment.providerPaymentId,
            metadata: (() => {
                const merged = mergeMetadata(payment.metadata, providerResult.metadata ?? null);
                return merged === undefined ? undefined : merged ?? Prisma.DbNull;
            })(),
        });
    }

    if (!providerResult.status || !VALID_TRANSITIONS[payment.status]?.includes(providerResult.status)) {
        throw new AppError("Payment provider reported an invalid or disallowed status transition.", 409);
    }

    return updatePaymentWithTransition(payment.id, providerResult.status, providerResult.metadata, {
        provider: providerResult.provider ?? payment.provider,
        providerPaymentId: providerResult.providerPaymentId ?? payment.providerPaymentId,
    });
};
