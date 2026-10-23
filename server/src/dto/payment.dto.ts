import type { Payment } from "../generated/prisma";

export type PaymentResponseDto = Pick<
    Payment,
    "id" | "orderId" | "purpose" | "amount" | "currency" | "status" | "createdAt" | "updatedAt"
>;

export const toPaymentResponseDto = (payment: Payment): PaymentResponseDto => ({
    id: payment.id,
    orderId: payment.orderId,
    purpose: payment.purpose,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
});
