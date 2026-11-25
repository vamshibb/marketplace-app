require('ts-node/register/transpile-only');

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
    PaymentStatus,
    PaymentWebhookEventStatus,
} = require('../src/generated/prisma');

const { prisma } = require('../src/prisma/client.ts');
const paymentRepository = require('../src/repositories/payment.repository.ts');

function createPayment(overrides = {}) {
    return {
        id: 'pay-webhook-chronology',
        orderId: 'order-webhook-chronology',
        purpose: 'SALE',
        provider: 'trusted-provider',
        providerPaymentId: 'pay_webhook_chronology',
        amount: '100.00',
        currency: 'USD',
        status: PaymentStatus.PROCESSING,
        idempotencyKey: 'order-webhook-chronology:SALE',
        metadata: null,
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        updatedAt: new Date('2026-10-01T00:00:00.000Z'),
        order: {
            id: 'order-webhook-chronology',
            buyerId: 'buyer-webhook-chronology',
            sellerId: 'seller-webhook-chronology',
            productId: 'product-webhook-chronology',
            productTitle: 'Webhook chronology test product',
            transactionType: 'SALE',
            status: 'IN_PROGRESS',
            unitPrice: '100.00',
        },
        ...overrides,
    };
}

async function withTransactionMock(transactionMock, callback) {
    const originalTransaction = prisma.$transaction;

    prisma.$transaction = async (transactionCallback) =>
        transactionCallback(transactionMock);

    try {
        return await callback();
    } finally {
        prisma.$transaction = originalTransaction;
    }
}

test(
    'older webhook event cannot overwrite payment state after a newer processed event',
    async () => {
        const incomingOccurredAt =
            new Date('2026-10-01T00:00:00.000Z');

        const newerOccurredAt =
            new Date('2026-10-01T00:01:00.000Z');

        const incomingEvent = {
            id: 'webhook-older',
            provider: 'trusted-provider',
            providerEventId: 'evt-older',
            eventType: 'payment.processing',
            paymentId: 'pay-webhook-chronology',
            providerPaymentId: 'pay_webhook_chronology',
            status: PaymentWebhookEventStatus.PROCESSING,
            occurredAt: incomingOccurredAt,
            receivedAt: new Date(),
            processedAt: null,
            reason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const newerProcessedEvent = {
            ...incomingEvent,
            id: 'webhook-newer',
            providerEventId: 'evt-newer',
            status: PaymentWebhookEventStatus.PROCESSED,
            occurredAt: newerOccurredAt,
            processedAt: new Date(),
        };

        let paymentStatus = PaymentStatus.PROCESSING;
        let chronologyLookupCalls = 0;
        let paymentUpdateCalls = 0;

        const payment = createPayment({
            status: paymentStatus,
        });

        const tx = {
            paymentWebhookEvent: {
                findUnique: async () => incomingEvent,

                findFirst: async () => {
                    chronologyLookupCalls += 1;
                    return newerProcessedEvent;
                },

                update: async ({ data }) => ({
                    ...incomingEvent,
                    ...data,
                }),
            },

            payment: {
                findUnique: async () => ({
                    ...payment,
                    status: paymentStatus,
                }),

                updateMany: async () => {
                    paymentUpdateCalls += 1;

                    throw new Error(
                        'payment.updateMany must not run for a chronologically stale webhook'
                    );
                },
            },
        };

        await withTransactionMock(tx, async () => {
            const result =
                await paymentRepository.finalizeWebhookTransition(
                    incomingEvent.id,
                    payment.id,
                    {
                        // This transition is otherwise valid.
                        // Chronology alone must prevent it.
                        paymentStatus: PaymentStatus.AUTHORIZED,
                        finalEventStatus:
                            PaymentWebhookEventStatus.PROCESSED,
                        provider: 'trusted-provider',
                        providerPaymentId:
                            'pay_webhook_chronology',
                        reason: null,
                    }
                );

            assert.equal(chronologyLookupCalls, 1);
            assert.equal(paymentUpdateCalls, 0);

            assert.equal(
                paymentStatus,
                PaymentStatus.PROCESSING
            );

            assert.equal(
                result.payment.status,
                PaymentStatus.PROCESSING
            );

            assert.equal(
                result.event.status,
                PaymentWebhookEventStatus.IGNORED
            );

            assert.equal(
                result.transitionApplied,
                false
            );
        });
    }
);

test(
    'equal webhook occurredAt timestamps fall through to normal transition rules',
    async () => {
        const occurredAt =
            new Date('2026-10-01T00:00:00.000Z');

        const incomingEvent = {
            id: 'webhook-equal-incoming',
            provider: 'trusted-provider',
            providerEventId: 'evt-equal-incoming',
            eventType: 'payment.processing',
            paymentId: 'pay-webhook-chronology',
            providerPaymentId: 'pay_webhook_chronology',
            status: PaymentWebhookEventStatus.PROCESSING,
            occurredAt,
            receivedAt: new Date(),
            processedAt: null,
            reason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const existingProcessedEvent = {
            ...incomingEvent,
            id: 'webhook-equal-existing',
            providerEventId: 'evt-equal-existing',
            status: PaymentWebhookEventStatus.PROCESSED,
            occurredAt: new Date(occurredAt.getTime()),
            processedAt: new Date(),
        };

        let paymentStatus = PaymentStatus.PROCESSING;
        let chronologyLookupCalls = 0;
        let paymentUpdateCalls = 0;

        const payment = createPayment({
            status: paymentStatus,
        });

        const tx = {
            paymentWebhookEvent: {
                findUnique: async () => incomingEvent,

                findFirst: async () => {
                    chronologyLookupCalls += 1;
                    return existingProcessedEvent;
                },

                update: async ({ data }) => ({
                    ...incomingEvent,
                    ...data,
                }),
            },

            payment: {
                findUnique: async () => ({
                    ...payment,
                    status: paymentStatus,
                }),

                updateMany: async ({
                    where,
                    data,
                }) => {
                    paymentUpdateCalls += 1;

                    assert.equal(
                        where.id,
                        payment.id
                    );

                    assert.equal(
                        where.status,
                        PaymentStatus.PROCESSING
                    );

                    assert.equal(
                        data.status,
                        PaymentStatus.AUTHORIZED
                    );

                    paymentStatus =
                        PaymentStatus.AUTHORIZED;

                    return {
                        count: 1,
                    };
                },
            },
        };

        await withTransactionMock(tx, async () => {
            const result =
                await paymentRepository.finalizeWebhookTransition(
                    incomingEvent.id,
                    payment.id,
                    {
                        paymentStatus:
                            PaymentStatus.AUTHORIZED,
                        finalEventStatus:
                            PaymentWebhookEventStatus.PROCESSED,
                        provider: 'trusted-provider',
                        providerPaymentId:
                            'pay_webhook_chronology',
                        reason: null,
                    }
                );

            assert.equal(
                chronologyLookupCalls,
                1
            );

            assert.equal(
                paymentUpdateCalls,
                1
            );

            assert.equal(
                result.payment.status,
                PaymentStatus.AUTHORIZED
            );

            assert.equal(
                result.event.status,
                PaymentWebhookEventStatus.PROCESSED
            );

            assert.equal(
                result.transitionApplied,
                true
            );
        });
    }
);