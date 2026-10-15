import { ListingType, PaymentPurpose, PaymentStatus, Prisma } from "../generated/prisma";
import { AppError } from "../errors/AppError";
import * as orderRepository from "../repositories/order.repository";
import * as paymentRepository from "../repositories/payment.repository";
import type { PaymentProvider, PaymentProviderRequest, PaymentProviderResult } from "./paymentProvider";

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

export const getPaymentById = async (id: string) => paymentRepository.findPaymentById(id);

export const getPaymentsByOrderId = async (orderId: string) =>
    paymentRepository.findPaymentsByOrderId(orderId);

export const getPaymentByOrderAndPurpose = async (orderId: string, purpose: PaymentPurpose) =>
    paymentRepository.findPaymentByOrderAndPurpose(orderId, purpose);

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

    return paymentRepository.updatePaymentStatus(payment.id, nextStatus, {
        provider: providerData?.provider ?? payment.provider,
        providerPaymentId: providerData?.providerPaymentId ?? payment.providerPaymentId,
        metadata: providerData?.metadata ?? metadataValue,
    });
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
