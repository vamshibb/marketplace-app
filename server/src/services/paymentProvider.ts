import { PaymentPurpose, PaymentStatus, Prisma } from "../generated/prisma";
import { AppError } from "../errors/AppError";

export type PaymentProviderMetadata = Prisma.InputJsonObject;

export interface PaymentProviderRequest {
    orderId: string;
    purpose: PaymentPurpose;
    amount: Prisma.Decimal;
    currency: string;
    idempotencyKey: string;
    operationIdempotencyKey?: string;
    providerPaymentId?: string | null;
    metadata?: PaymentProviderMetadata | null;
}

export interface PaymentProviderResult {
    provider: string;
    providerPaymentId?: string | null;
    status: PaymentStatus;
    metadata?: PaymentProviderMetadata | null;
}

export interface PaymentProvider {
    authorize(input: PaymentProviderRequest): Promise<PaymentProviderResult>;
    capture(input: PaymentProviderRequest & { providerPaymentId?: string | null }): Promise<PaymentProviderResult>;
    cancel(input: PaymentProviderRequest & { providerPaymentId?: string | null }): Promise<PaymentProviderResult>;
    refund(input: PaymentProviderRequest & { providerPaymentId?: string | null }): Promise<PaymentProviderResult>;
    getStatus(providerPaymentId: string, orderId?: string): Promise<PaymentProviderResult>;
}

export const unsupportedPaymentProvider: PaymentProvider = {
    async authorize() {
        throw new AppError("No payment provider is configured for this environment.", 501);
    },
    async capture() {
        throw new AppError("No payment provider is configured for this environment.", 501);
    },
    async cancel() {
        throw new AppError("No payment provider is configured for this environment.", 501);
    },
    async refund() {
        throw new AppError("No payment provider is configured for this environment.", 501);
    },
    async getStatus() {
        throw new AppError("No payment provider is configured for this environment.", 501);
    },
};
