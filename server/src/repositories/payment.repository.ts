import { PaymentPurpose, PaymentStatus, PaymentWebhookEventStatus, Prisma } from "../generated/prisma";
import { AppError } from "../errors/AppError";
import { prisma } from "../prisma/client";

export const paymentSelect = {
    id: true,
    orderId: true,
    purpose: true,
    provider: true,
    providerPaymentId: true,
    amount: true,
    currency: true,
    status: true,
    idempotencyKey: true,
    metadata: true,
    createdAt: true,
    updatedAt: true,
    order: {
        select: {
            id: true,
            buyerId: true,
            sellerId: true,
            productId: true,
            productTitle: true,
            transactionType: true,
            status: true,
            unitPrice: true,
        },
    },
} satisfies Prisma.PaymentSelect;

export const paymentWebhookEventSelect = {
    id: true,
    provider: true,
    providerEventId: true,
    eventType: true,
    paymentId: true,
    providerPaymentId: true,
    status: true,
    occurredAt: true,
    receivedAt: true,
    processedAt: true,
    reason: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.PaymentWebhookEventSelect;

export const findPaymentById = (id: string) =>
    prisma.payment.findUnique({
        where: { id },
        select: paymentSelect,
    });

export const findPaymentsByOrderId = (orderId: string) =>
    prisma.payment.findMany({
        where: { orderId },
        select: paymentSelect,
    });

export const findPaymentByOrderAndPurpose = (orderId: string, purpose: PaymentPurpose) =>
    prisma.payment.findUnique({
        where: { orderId_purpose: { orderId, purpose } },
        select: paymentSelect,
    });

export const findPaymentByIdempotencyKey = (idempotencyKey: string) =>
    prisma.payment.findUnique({
        where: { idempotencyKey },
        select: paymentSelect,
    });

export const findPaymentByProviderReference = (provider: string, providerPaymentId: string) =>
    prisma.payment.findUnique({
        where: { provider_providerPaymentId: { provider, providerPaymentId } },
        select: paymentSelect,
    });

export const createPayment = (data: Prisma.PaymentUncheckedCreateInput) =>
    prisma.payment.create({
        data,
        select: paymentSelect,
    });

type PaymentStatusUpdateData = Partial<{
    provider: string | null;
    providerPaymentId: string | null;
    metadata: Prisma.PaymentUncheckedUpdateInput["metadata"];
}>;

export const updatePaymentStatus = (
    id: string,
    status: PaymentStatus,
    data: PaymentStatusUpdateData = {}
) =>
    prisma.payment.update({
        where: { id },
        data: {
            status,
            ...data,
        },
        select: paymentSelect,
    });

export const findWebhookEventByProviderEventId = (provider: string, providerEventId: string) =>
    prisma.paymentWebhookEvent.findUnique({
        where: {
            provider_providerEventId: {
                provider,
                providerEventId,
            },
        },
        select: paymentWebhookEventSelect,
    });

const PROCESSING_CLAIM_STALE_MS = 5 * 60 * 1000;

const isUniqueConstraintError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const resolveClaimState = (event: { status: PaymentWebhookEventStatus }) => {
    if (event.status === PaymentWebhookEventStatus.PROCESSED || event.status === PaymentWebhookEventStatus.IGNORED) {
        return "duplicate" as const;
    }

    if (event.status === PaymentWebhookEventStatus.PROCESSING) {
        return "busy" as const;
    }

    return "retry" as const;
};

const isProcessingEventStale = (event: { updatedAt: Date; receivedAt: Date }) => {
    const lastUpdated = event.updatedAt ?? event.receivedAt;
    return new Date(lastUpdated).getTime() < Date.now() - PROCESSING_CLAIM_STALE_MS;
};

export const claimWebhookEvent = async (
    provider: string,
    providerEventId: string,
    data: {
        eventType: string;
        paymentId?: string | null;
        providerPaymentId?: string | null;
        status?: PaymentWebhookEventStatus;
        occurredAt?: Date | null;
        reason?: string | null;
    }
) => {
    const uniqueWhere = {
        provider_providerEventId: {
            provider,
            providerEventId,
        },
    } as const;

    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
        where: uniqueWhere,
        select: paymentWebhookEventSelect,
    });

    if (existingEvent) {
        if (existingEvent.status === PaymentWebhookEventStatus.PROCESSED || existingEvent.status === PaymentWebhookEventStatus.IGNORED) {
            return {
                event: existingEvent,
                claimed: false,
                created: false,
                state: "duplicate" as const,
            };
        }

        if (existingEvent.status === PaymentWebhookEventStatus.PROCESSING) {
            const stale = isProcessingEventStale(existingEvent as { updatedAt: Date; receivedAt: Date });
            if (!stale) {
                return {
                    event: existingEvent,
                    claimed: false,
                    created: false,
                    state: "busy" as const,
                };
            }

            const reclaimed = await prisma.paymentWebhookEvent.updateMany({
                where: {
                    id: existingEvent.id,
                    status: PaymentWebhookEventStatus.PROCESSING,
                    updatedAt: { lt: new Date(Date.now() - PROCESSING_CLAIM_STALE_MS) },
                },
                data: {
                    updatedAt: new Date(),
                },
            });

            if (reclaimed.count === 1) {
                const reclaimedEvent = await prisma.paymentWebhookEvent.findUnique({
                    where: { id: existingEvent.id },
                    select: paymentWebhookEventSelect,
                });

                if (!reclaimedEvent) {
                    throw new Error("Webhook event missing after stale PROCESSING reclaim.");
                }

                return {
                    event: reclaimedEvent,
                    claimed: true,
                    created: false,
                    state: "claimed" as const,
                };
            }

            const currentEvent = await prisma.paymentWebhookEvent.findUnique({
                where: { id: existingEvent.id },
                select: paymentWebhookEventSelect,
            });

            if (!currentEvent) {
                throw new Error("Webhook event disappeared during stale PROCESSING reclaim.");
            }

            return {
                event: currentEvent,
                claimed: false,
                created: false,
                state: resolveClaimState(currentEvent),
            };
        }

        const claimedUpdate = await prisma.paymentWebhookEvent.updateMany({
            where: {
                id: existingEvent.id,
                status: {
                    in: [PaymentWebhookEventStatus.RECEIVED, PaymentWebhookEventStatus.FAILED],
                },
            },
            data: {
                status: PaymentWebhookEventStatus.PROCESSING,
                updatedAt: new Date(),
            },
        });

        if (claimedUpdate.count === 1) {
            const claimedEvent = await prisma.paymentWebhookEvent.findUnique({
                where: { id: existingEvent.id },
                select: paymentWebhookEventSelect,
            });

            if (!claimedEvent) {
                throw new Error("Webhook event missing after re-claiming an existing row.");
            }

            return {
                event: claimedEvent,
                claimed: true,
                created: false,
                state: "claimed" as const,
            };
        }

        const currentEvent = await prisma.paymentWebhookEvent.findUnique({
            where: { id: existingEvent.id },
            select: paymentWebhookEventSelect,
        });

        if (!currentEvent) {
            throw new Error("Webhook event disappeared while re-claiming an existing row.");
        }

        return {
            event: currentEvent,
            claimed: false,
            created: false,
            state: resolveClaimState(currentEvent),
        };
    }

    try {
        const createdEvent = await prisma.paymentWebhookEvent.create({
            data: {
                provider,
                providerEventId,
                eventType: data.eventType,
                paymentId: data.paymentId ?? null,
                providerPaymentId: data.providerPaymentId ?? null,
                status: data.status ?? PaymentWebhookEventStatus.RECEIVED,
                occurredAt: data.occurredAt ?? null,
                reason: data.reason ?? null,
            },
            select: paymentWebhookEventSelect,
        });

        const claimedUpdate = await prisma.paymentWebhookEvent.updateMany({
            where: {
                id: createdEvent.id,
                status: {
                    in: [PaymentWebhookEventStatus.RECEIVED, PaymentWebhookEventStatus.FAILED],
                },
            },
            data: {
                status: PaymentWebhookEventStatus.PROCESSING,
                updatedAt: new Date(),
            },
        });

        if (claimedUpdate.count === 1) {
            const claimedEvent = await prisma.paymentWebhookEvent.findUnique({
                where: { id: createdEvent.id },
                select: paymentWebhookEventSelect,
            });

            if (!claimedEvent) {
                throw new Error("Webhook event missing after successful claim.");
            }

            return {
                event: claimedEvent,
                claimed: true,
                created: true,
                state: "claimed",
            };
        }

        const settledEvent = await prisma.paymentWebhookEvent.findUnique({
            where: { id: createdEvent.id },
            select: paymentWebhookEventSelect,
        });

        if (!settledEvent) {
            throw new Error("Webhook event missing after claim retry check.");
        }

        return {
            event: settledEvent,
            claimed: false,
            created: false,
            state: resolveClaimState(settledEvent),
        };
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            const winner = await prisma.paymentWebhookEvent.findUnique({
                where: uniqueWhere,
                select: paymentWebhookEventSelect,
            });

            if (!winner) {
                throw error;
            }

            return {
                event: winner,
                claimed: false,
                created: false,
                state: resolveClaimState(winner),
            };
        }

        throw error;
    }
};

const VALID_FORWARD_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
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

export const finalizeWebhookTransition = async (
    eventId: string,
    paymentId: string,
    data: {
        paymentStatus: PaymentStatus;
        finalEventStatus: PaymentWebhookEventStatus;
        provider: string;
        providerPaymentId: string;
        reason?: string | null;
        metadata?: Prisma.PaymentUncheckedUpdateInput["metadata"];
    }
) =>
    prisma.$transaction(async (tx) => {
        const event = await tx.paymentWebhookEvent.findUnique({
            where: { id: eventId },
            select: paymentWebhookEventSelect,
        });

        if (!event) {
            throw new AppError("Webhook event not found.", 404);
        }

        if (event.status !== PaymentWebhookEventStatus.PROCESSING) {
            throw new AppError(
                `Webhook event ${eventId} is not in PROCESSING and cannot be finalized as a financial transition.`,
                409
            );
        }

        const payment = await tx.payment.findUnique({
            where: { id: paymentId },
            select: paymentSelect,
        });

        if (!payment) {
            throw new AppError("Payment not found.", 404);
        }

        let nextEventStatus = data.finalEventStatus;
        let finalReason = data.reason ?? null;
        let updatedPayment = payment;

        if (payment.status === data.paymentStatus) {
            nextEventStatus = PaymentWebhookEventStatus.PROCESSED;
            finalReason = data.reason ?? "Webhook status already matched the persisted payment status; no mutation was required.";
        } else {
            const validTransition = (VALID_FORWARD_TRANSITIONS[payment.status] ?? []).includes(data.paymentStatus);
            if (validTransition) {
                try {
                    updatedPayment = await tx.payment.update({
                        where: { id: paymentId },
                        data: {
                            status: data.paymentStatus,
                            provider: data.provider,
                            providerPaymentId: data.providerPaymentId,
                            metadata: data.metadata === undefined ? undefined : data.metadata ?? Prisma.DbNull,
                        },
                        select: paymentSelect,
                    });
                } catch (error) {
                    if (isUniqueConstraintError(error)) {
                        throw new AppError("A payment with the same provider transaction identity already exists.", 409);
                    }
                    throw error;
                }

                nextEventStatus = PaymentWebhookEventStatus.PROCESSED;
                finalReason = data.reason ?? null;
            } else {
                nextEventStatus = PaymentWebhookEventStatus.IGNORED;
                finalReason = data.reason ?? `Webhook payment status ${data.paymentStatus} is stale or out of order for payment status ${payment.status}.`;
            }
        }

        const finalEvent = await tx.paymentWebhookEvent.update({
            where: {
                id: eventId,
                status: PaymentWebhookEventStatus.PROCESSING,
            },
            data: {
                status: nextEventStatus,
                paymentId: updatedPayment.id,
                providerPaymentId: data.providerPaymentId,
                reason: finalReason,
                processedAt: new Date(),
            },
            select: paymentWebhookEventSelect,
        });

        return {
            payment: updatedPayment,
            event: finalEvent,
        };
    });

export const updateWebhookEventStatus = (
    id: string,
    data: {
        status?: PaymentWebhookEventStatus;
        paymentId?: string | null;
        providerPaymentId?: string | null;
        reason?: string | null;
        processedAt?: Date | null;
    },
    options?: {
        expectedStatus?: PaymentWebhookEventStatus[];
    }
) => {
    const updateData: {
        status?: PaymentWebhookEventStatus;
        paymentId?: string | null;
        providerPaymentId?: string | null;
        reason?: string | null;
        processedAt?: Date | null;
    } = {};

    if (data.status !== undefined) {
        updateData.status = data.status;
    }

    if (data.paymentId !== undefined) {
        updateData.paymentId = data.paymentId;
    }

    if (data.providerPaymentId !== undefined) {
        updateData.providerPaymentId = data.providerPaymentId;
    }

    if (data.reason !== undefined) {
        updateData.reason = data.reason;
    }

    if (data.processedAt !== undefined) {
        updateData.processedAt = data.processedAt;
    }

    return prisma.paymentWebhookEvent.update({
        where: {
            id,
            ...(options?.expectedStatus && options.expectedStatus.length > 0
                ? { status: { in: options.expectedStatus } }
                : {}),
        },
        data: updateData,
        select: paymentWebhookEventSelect,
    });
};
