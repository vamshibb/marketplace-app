import { PaymentPurpose, PaymentStatus, Prisma } from "../generated/prisma";
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
