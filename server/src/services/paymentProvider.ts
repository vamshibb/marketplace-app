import { PaymentPurpose, PaymentStatus, Prisma } from "../generated/prisma";
import { AppError } from "../errors/AppError";

export type PaymentProviderMetadata = Prisma.InputJsonObject;
export type PaymentProviderHeaders = Record<string, string | string[] | undefined>;

export interface VerifiedPaymentWebhookEvent {
    provider: string;
    providerEventId: string;
    eventType: string;
    providerPaymentId?: string | null;
    paymentStatus?: PaymentStatus | null;
    occurredAt?: Date | null;
    safeMetadata?: PaymentProviderMetadata | null;
}

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
    name: string;
    authorize(input: PaymentProviderRequest): Promise<PaymentProviderResult>;
    capture(input: PaymentProviderRequest & { providerPaymentId?: string | null }): Promise<PaymentProviderResult>;
    cancel(input: PaymentProviderRequest & { providerPaymentId?: string | null }): Promise<PaymentProviderResult>;
    refund(input: PaymentProviderRequest & { providerPaymentId?: string | null }): Promise<PaymentProviderResult>;
    getStatus(providerPaymentId: string, orderId?: string): Promise<PaymentProviderResult>;
    verifyWebhook(rawBody: Buffer, headers: PaymentProviderHeaders): Promise<VerifiedPaymentWebhookEvent>;
}

export const unsupportedPaymentProvider: PaymentProvider = {
    name: "unsupported",
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
    async verifyWebhook() {
        throw new AppError("No payment provider is configured for this environment.", 501);
    },
};

export const getConfiguredPaymentProvider = (): PaymentProvider => {
    const configured = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();

    if (!configured) {
        return unsupportedPaymentProvider;
    }

    if (configured === "mock") {
        throw new AppError(
            "Mock payment provider is not allowed in production. Configure a real provider adapter instead.",
            500
        );
    }

    throw new AppError(
        `Unsupported payment provider configuration: ${configured}. No real provider adapter is configured for this environment.`,
        501
    );
};
