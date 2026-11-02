import Stripe from "stripe";
import { PaymentStatus, Prisma } from "../generated/prisma";
import { AppError } from "../errors/AppError";
import type {
    PaymentProvider,
    PaymentProviderRequest,
    PaymentProviderResult,
} from "./paymentProvider";

const STRIPE_PROVIDER_NAME = "stripe";

const requireStripeSecretKey = (): string => {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

    if (!secretKey) {
        throw new AppError(
            "STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe.",
            500
        );
    }

    return secretKey;
};

const createStripeClient = (): Stripe =>
    new Stripe(requireStripeSecretKey(), {
        maxNetworkRetries: 2,
    });

const requireProviderPaymentId = (
    input: PaymentProviderRequest,
    operation: string
): string => {
    const providerPaymentId =
        input.providerPaymentId?.trim();

    if (!providerPaymentId) {
        throw new AppError(
            `Stripe PaymentIntent ID is required for ${operation}.`,
            409
        );
    }

    return providerPaymentId;
};

const toStripeMinorUnits = (
    amount: Prisma.Decimal,
    currency: string
): number => {
    const normalizedCurrency =
        currency.trim().toUpperCase();

    if (normalizedCurrency !== "CAD") {
        throw new AppError(
            `Stripe payment currency ${normalizedCurrency} is not supported yet.`,
            409
        );
    }

    const minorUnits = amount.mul(100);

    if (!minorUnits.isInteger()) {
        throw new AppError(
            "Stripe payment amount cannot be represented in minor currency units.",
            409
        );
    }

    const value = minorUnits.toNumber();

    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new AppError(
            "Stripe payment amount is outside the supported range.",
            409
        );
    }

    return value;
};

const mapPaymentIntentStatus = (
    status: Stripe.PaymentIntent.Status
): PaymentStatus => {
    switch (status) {
        case "requires_capture":
            return PaymentStatus.AUTHORIZED;

        case "succeeded":
            return PaymentStatus.CAPTURED;

        case "canceled":
            return PaymentStatus.CANCELLED;

        case "processing":
        case "requires_action":
        case "requires_confirmation":
        case "requires_payment_method":
            return PaymentStatus.PROCESSING;

        default:
            throw new AppError(
                `Unsupported Stripe PaymentIntent status: ${status}.`,
                409
            );
    }
};

const getExpandedLatestCharge = (
    paymentIntent: Stripe.PaymentIntent
): Stripe.Charge | null => {
    const latestCharge = paymentIntent.latest_charge;

    if (
        !latestCharge ||
        typeof latestCharge === "string"
    ) {
        return null;
    }

    return latestCharge;
};

const resolvePaymentStatus = (
    paymentIntent: Stripe.PaymentIntent
): PaymentStatus => {
    const charge =
        getExpandedLatestCharge(paymentIntent);

    if (charge?.refunded) {
        return PaymentStatus.REFUNDED;
    }

    if (
        charge &&
        charge.amount_refunded > 0
    ) {
        return PaymentStatus.PARTIALLY_REFUNDED;
    }

    return mapPaymentIntentStatus(
        paymentIntent.status
    );
};

const toProviderResult = (
    paymentIntent: Stripe.PaymentIntent
): PaymentProviderResult => {
    const charge =
        getExpandedLatestCharge(paymentIntent);

    return {
        provider: STRIPE_PROVIDER_NAME,
        providerPaymentId: paymentIntent.id,
        status: resolvePaymentStatus(paymentIntent),
        clientSecret:
            paymentIntent.client_secret ?? null,
        metadata: {
            stripePaymentIntentStatus:
                paymentIntent.status,
            ...(charge
                ? {
                      stripeChargeId: charge.id,
                      stripeAmountRefunded:
                          charge.amount_refunded,
                  }
                : {}),
        },
    };
};

const buildStripeMetadata = (
    input: PaymentProviderRequest
): Stripe.MetadataParam => ({
    orderId: input.orderId,
    purpose: input.purpose,
    localPaymentIdempotencyKey:
        input.idempotencyKey,
});

export const createStripePaymentProvider = (
    stripe: Stripe
): PaymentProvider => ({
    name: STRIPE_PROVIDER_NAME,

    async authorize(
        input: PaymentProviderRequest
    ): Promise<PaymentProviderResult> {
        const paymentIntent =
            await stripe.paymentIntents.create(
                {
                    amount: toStripeMinorUnits(
                        input.amount,
                        input.currency
                    ),
                    currency:
                        input.currency.toLowerCase(),
                    capture_method: "manual",
                    automatic_payment_methods: {
                        enabled: true,
                    },
                    metadata:
                        buildStripeMetadata(input),
                },
                {
                    idempotencyKey:
                        input.operationIdempotencyKey ??
                        `${input.idempotencyKey}:authorize`,
                }
            );

        return toProviderResult(paymentIntent);
    },

    async capture(
        input: PaymentProviderRequest
    ): Promise<PaymentProviderResult> {
        const providerPaymentId =
            requireProviderPaymentId(
                input,
                "capture"
            );

        const paymentIntent =
            await stripe.paymentIntents.capture(
                providerPaymentId,
                {},
                {
                    idempotencyKey:
                        input.operationIdempotencyKey ??
                        `${input.idempotencyKey}:capture`,
                }
            );

        return toProviderResult(paymentIntent);
    },

    async cancel(
        input: PaymentProviderRequest
    ): Promise<PaymentProviderResult> {
        const providerPaymentId =
            requireProviderPaymentId(
                input,
                "cancellation"
            );

        const paymentIntent =
            await stripe.paymentIntents.cancel(
                providerPaymentId,
                {},
                {
                    idempotencyKey:
                        input.operationIdempotencyKey ??
                        `${input.idempotencyKey}:cancel`,
                }
            );

        return toProviderResult(paymentIntent);
    },

    async refund(
        input: PaymentProviderRequest
    ): Promise<PaymentProviderResult> {
        const providerPaymentId =
            requireProviderPaymentId(
                input,
                "refund"
            );

        const refund =
            await stripe.refunds.create(
                {
                    payment_intent:
                        providerPaymentId,
                },
                {
                    idempotencyKey:
                        input.operationIdempotencyKey ??
                        `${input.idempotencyKey}:refund`,
                }
            );

        if (refund.status !== "succeeded") {
            throw new AppError(
                `Stripe refund is not complete. Current status: ${refund.status}.`,
                409
            );
        }

        const paymentIntent =
            await stripe.paymentIntents.retrieve(
                providerPaymentId,
                {
                    expand: ["latest_charge"],
                }
            );

        return {
            ...toProviderResult(paymentIntent),
            status: PaymentStatus.REFUNDED,
            metadata: {
                stripePaymentIntentStatus:
                    paymentIntent.status,
                stripeRefundId: refund.id,
                stripeRefundStatus:
                    refund.status,
            },
        };
    },

    async getStatus(
        providerPaymentId: string
    ): Promise<PaymentProviderResult> {
        const paymentIntent =
            await stripe.paymentIntents.retrieve(
                providerPaymentId,
                {
                    expand: ["latest_charge"],
                }
            );

        return toProviderResult(paymentIntent);
    },

    async verifyWebhook() {
        throw new AppError(
            "Stripe webhook verification is not implemented until P4.",
            501
        );
    },
});

let configuredStripeProvider: PaymentProvider | null = null;

const getStripePaymentProvider = (): PaymentProvider => {
    if (!configuredStripeProvider) {
        configuredStripeProvider =
            createStripePaymentProvider(
                createStripeClient()
            );
    }

    return configuredStripeProvider;
};

export const stripePaymentProvider: PaymentProvider = {
    name: STRIPE_PROVIDER_NAME,

    authorize(input) {
        return getStripePaymentProvider().authorize(input);
    },

    capture(input) {
        return getStripePaymentProvider().capture(input);
    },

    cancel(input) {
        return getStripePaymentProvider().cancel(input);
    },

    refund(input) {
        return getStripePaymentProvider().refund(input);
    },

    getStatus(providerPaymentId, orderId) {
        return getStripePaymentProvider().getStatus(
            providerPaymentId,
            orderId
        );
    },

    verifyWebhook(rawBody, headers) {
        return getStripePaymentProvider().verifyWebhook(
            rawBody,
            headers
        );
    },
};