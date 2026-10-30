require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { Prisma, PaymentPurpose, PaymentStatus } = require('../src/generated/prisma');const orderRepository = require('../src/repositories/order.repository.ts');
const paymentRepository = require('../src/repositories/payment.repository.ts');
const paymentService = require('../src/services/payment.service.ts');

async function withOrderStubs(overrides, fn) {
    const originals = {};
    for (const key of Object.keys(overrides)) {
        originals[key] = orderRepository[key];
    }

    Object.assign(orderRepository, overrides);

    try {
        return await fn();
    } finally {
        for (const [key, value] of Object.entries(originals)) {
            orderRepository[key] = value;
        }
    }
}

async function withPaymentStubs(overrides, fn) {
    const originals = {};
    for (const key of Object.keys(overrides)) {
        originals[key] = paymentRepository[key];
    }

    Object.assign(paymentRepository, overrides);

    try {
        return await fn();
    } finally {
        for (const [key, value] of Object.entries(originals)) {
            paymentRepository[key] = value;
        }
    }
}

const unsupportedProvider = {
    name: 'unsupported',
    async authorize() { throw new Error('not used'); },
    async capture() { throw new Error('not used'); },
    async cancel() { throw new Error('not used'); },
    async refund() { throw new Error('not used'); },
    async getStatus() { throw new Error('not used'); },
    async verifyWebhook() { throw new Error('not used'); },
};

test('buyer ownership is enforced for checkout authorization', async () => {
    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-1',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'SALE',
            unitPrice: '100.00',
            quantity: 1,
        }),
    }, async () => {
        await assert.rejects(
            () => paymentService.authorizeOrderPayment('order-1', 'buyer-2', unsupportedProvider),
            (error) => error.statusCode === 403 && /not authorized|authorized/i.test(error.message)
        );
    });
});

function createCheckoutPaymentHarness() {
    const state = {
        byId: new Map(),
        byOrderPurpose: new Map(),
        byKey: new Map(),
    };

    const store = (payment) => {
        state.byId.set(payment.id, payment);
        state.byOrderPurpose.set(
            `${payment.orderId}:${payment.purpose}`,
            payment
        );
        state.byKey.set(payment.idempotencyKey, payment);
        return payment;
    };

    return {
        state,
        store,

        stubs: {
            findPaymentByOrderAndPurpose: async (orderId, purpose) =>
                state.byOrderPurpose.get(`${orderId}:${purpose}`) ?? null,

            findPaymentByIdempotencyKey: async (idempotencyKey) =>
                state.byKey.get(idempotencyKey) ?? null,

            findPaymentById: async (id) =>
                state.byId.get(id) ?? null,

            createPayment: async (data) => {
                return store({
                    id: `pay-${state.byId.size + 1}`,
                    orderId: data.orderId,
                    purpose: data.purpose,
                    provider: data.provider ?? null,
                    providerPaymentId:
                        data.providerPaymentId ?? null,
                    amount: new Prisma.Decimal(
                        data.amount.toString()
                    ),
                    currency: data.currency,
                    status: data.status,
                    idempotencyKey: data.idempotencyKey,
                    metadata: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            },

            updatePaymentStatus: async (
                id,
                status,
                data = {}
            ) => {
                const payment = state.byId.get(id);

                if (!payment) {
                    throw new Error('Payment not found');
                }

                payment.status = status;

                if (data.provider !== undefined) {
                    payment.provider = data.provider;
                }

                if (
                    data.providerPaymentId !== undefined
                ) {
                    payment.providerPaymentId =
                        data.providerPaymentId;
                }

                if (data.metadata !== undefined) {
                    payment.metadata = data.metadata;
                }

                payment.updatedAt = new Date();

                return payment;
            },
        },
    };
}

test('SALE checkout authorizes the immutable order subtotal and currency', async () => {
    const harness = createCheckoutPaymentHarness();

    let providerInput = null;

    const provider = {
        name: 'mock-provider',

        async authorize(input) {
            providerInput = input;

            return {
                provider: 'mock-provider',
                providerPaymentId: 'sale-provider-payment',
                status: PaymentStatus.AUTHORIZED,
                metadata: null,
            };
        },

        async capture() {
            throw new Error('not used');
        },

        async cancel() {
            throw new Error('not used');
        },

        async refund() {
            throw new Error('not used');
        },

        async getStatus() {
            throw new Error('not used');
        },

        async verifyWebhook() {
            throw new Error('not used');
        },
    };

    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-sale',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'SALE',

            unitPrice: new Prisma.Decimal('24800.00'),
            quantity: 1,

            currency: 'CAD',
            subtotal: new Prisma.Decimal('24800.00'),

            rentalDays: null,
            rentalDepositAmount: null,
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                const result =
                    await paymentService.authorizeOrderPayment(
                        'order-sale',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.status,
                    PaymentStatus.AUTHORIZED
                );

                assert.equal(
                    result.purpose,
                    PaymentPurpose.SALE
                );

                assert.equal(
                    result.amount.toString(),
                    '24800'
                );

                assert.equal(result.currency, 'CAD');

                assert.equal(
                    providerInput.purpose,
                    PaymentPurpose.SALE
                );

                assert.equal(
                    providerInput.amount.toString(),
                    '24800'
                );

                assert.equal(
                    providerInput.currency,
                    'CAD'
                );
            }
        );
    });
});

test('RENT checkout authorizes rental subtotal and never uses RENT_DEPOSIT as the main charge', async () => {
    const harness = createCheckoutPaymentHarness();

    let providerInput = null;

    const provider = {
        name: 'mock-provider',

        async authorize(input) {
            providerInput = input;

            return {
                provider: 'mock-provider',
                providerPaymentId: 'rent-provider-payment',
                status: PaymentStatus.AUTHORIZED,
                metadata: null,
            };
        },

        async capture() {
            throw new Error('not used');
        },

        async cancel() {
            throw new Error('not used');
        },

        async refund() {
            throw new Error('not used');
        },

        async getStatus() {
            throw new Error('not used');
        },

        async verifyWebhook() {
            throw new Error('not used');
        },
    };

    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-rent',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'RENT',

            unitPrice: new Prisma.Decimal('150.00'),
            quantity: 1,

            currency: 'CAD',
            subtotal: new Prisma.Decimal('450.00'),

            rentalDays: 3,
            rentalDepositAmount:
                new Prisma.Decimal('150.00'),
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                const result =
                    await paymentService.authorizeOrderPayment(
                        'order-rent',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.status,
                    PaymentStatus.AUTHORIZED
                );

                assert.equal(
                    result.purpose,
                    PaymentPurpose.RENT
                );

                assert.equal(
                    result.amount.toString(),
                    '450'
                );

                assert.equal(result.currency, 'CAD');

                assert.equal(
                    providerInput.purpose,
                    PaymentPurpose.RENT
                );

                assert.notEqual(
                    providerInput.purpose,
                    PaymentPurpose.RENT_DEPOSIT
                );

                assert.equal(
                    providerInput.amount.toString(),
                    '450'
                );

                assert.equal(
                    providerInput.currency,
                    'CAD'
                );
            }
        );
    });
});

test('repeated checkout authorization returns an existing authorized payment without calling the provider again', async () => {
    const harness = createCheckoutPaymentHarness();

    harness.store({
        id: 'pay-existing',
        orderId: 'order-repeat',
        purpose: PaymentPurpose.RENT,
        provider: 'mock-provider',
        providerPaymentId: 'existing-provider-payment',
        amount: new Prisma.Decimal('450.00'),
        currency: 'CAD',
        status: PaymentStatus.AUTHORIZED,
        idempotencyKey:
            `order-repeat:${PaymentPurpose.RENT}`,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    let authorizeCalls = 0;

    const provider = {
        name: 'mock-provider',

        async authorize() {
            authorizeCalls += 1;
            throw new Error(
                'provider should not be called'
            );
        },

        async capture() {
            throw new Error('not used');
        },

        async cancel() {
            throw new Error('not used');
        },

        async refund() {
            throw new Error('not used');
        },

        async getStatus() {
            throw new Error('not used');
        },

        async verifyWebhook() {
            throw new Error('not used');
        },
    };

    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-repeat',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'RENT',

            unitPrice: new Prisma.Decimal('150.00'),
            quantity: 1,

            currency: 'CAD',
            subtotal: new Prisma.Decimal('450.00'),

            rentalDays: 3,
            rentalDepositAmount:
                new Prisma.Decimal('150.00'),
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                const result =
                    await paymentService.authorizeOrderPayment(
                        'order-repeat',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.id,
                    'pay-existing'
                );

                assert.equal(
                    result.status,
                    PaymentStatus.AUTHORIZED
                );

                assert.equal(authorizeCalls, 0);
            }
        );
    });
});

test('webhook verifier sees the exact raw body and canonical provider identity', async () => {
    const rawBody = Buffer.from(JSON.stringify({ hello: 'world' }));
    const provider = {
        name: 'trusted-provider',
        async authorize() { throw new Error('not used'); },
        async capture() { throw new Error('not used'); },
        async cancel() { throw new Error('not used'); },
        async refund() { throw new Error('not used'); },
        async getStatus() { throw new Error('not used'); },
        async verifyWebhook(incomingBody, headers) {
            assert.equal(incomingBody.toString(), rawBody.toString());
            assert.deepEqual(headers['x-test'], ['abc']);
            return {
                provider: 'trusted-provider',
                providerEventId: 'evt-123',
                eventType: 'payment.succeeded',
                providerPaymentId: 'pay_123',
                paymentStatus: PaymentStatus.CAPTURED,
                occurredAt: new Date('2026-10-01T00:00:00.000Z'),
                safeMetadata: { source: 'trusted-provider' },
            };
        },
    };

    await withPaymentStubs({
        claimWebhookEvent: async (providerName, providerEventId, payload) => {
            assert.equal(providerName, 'trusted-provider');
            assert.equal(providerEventId, 'evt-123');
            return {
                event: {
                    id: 'webhook-1',
                    provider: 'trusted-provider',
                    providerEventId,
                    eventType: payload.eventType,
                    providerPaymentId: 'pay_123',
                    paymentId: 'pay-1',
                    status: 'PROCESSING',
                    processedAt: null,
                    reason: null,
                },
                claimed: true,
                created: true,
                state: 'claimed',
            };
        },
        findPaymentByProviderReference: async () => ({
            id: 'pay-1',
            orderId: 'order-1',
            provider: 'trusted-provider',
            providerPaymentId: 'pay_123',
            purpose: PaymentPurpose.SALE,
            status: PaymentStatus.PENDING,
            amount: '100.00',
            currency: 'USD',
            metadata: null,
        }),
        finalizeWebhookTransition: async (eventId, paymentId, data) => {
            assert.equal(eventId, 'webhook-1');
            assert.equal(paymentId, 'pay-1');
            assert.equal(data.paymentStatus, PaymentStatus.CAPTURED);
            assert.equal(data.finalEventStatus, 'PROCESSED');
            assert.equal(data.provider, 'trusted-provider');
            assert.equal(data.providerPaymentId, 'pay_123');

            return {
                payment: {
                    id: 'pay-1',
                    orderId: 'order-1',
                    provider: 'trusted-provider',
                    providerPaymentId: 'pay_123',
                    purpose: PaymentPurpose.SALE,
                    status: PaymentStatus.CAPTURED,
                    amount: '100.00',
                    currency: 'USD',
                    metadata: { source: 'trusted-provider' },
                },
                event: {
                    id: 'webhook-1',
                    provider: 'trusted-provider',
                    providerEventId: 'evt-123',
                    eventType: 'payment.succeeded',
                    providerPaymentId: 'pay_123',
                    paymentId: 'pay-1',
                    status: 'PROCESSED',
                    processedAt: new Date(),
                    reason: null,
                },
            };
        },
    }, async () => {
        const result = await paymentService.processWebhookEvent('trusted-provider', rawBody, { 'x-test': ['abc'] }, provider);
        assert.equal(result.acknowledged, true);
        assert.equal(result.event.status, 'PROCESSED');
        assert.equal(result.payment.status, PaymentStatus.CAPTURED);
    });
});

test('retryable unresolved payment reference is not falsely acknowledged', async () => {
    await withPaymentStubs({
        claimWebhookEvent: async () => ({
            event: { id: 'webhook-2', provider: 'trusted-provider', providerEventId: 'evt-999', eventType: 'payment.succeeded', providerPaymentId: 'pay_missing', paymentId: null, status: 'RECEIVED', processedAt: null, reason: null },
            claimed: true,
            created: true,
        }),
        findPaymentByProviderReference: async () => null,
        updateWebhookEventStatus: async (_, data) => ({
            id: 'webhook-2',
            provider: 'trusted-provider',
            providerEventId: 'evt-999',
            eventType: 'payment.succeeded',
            providerPaymentId: 'pay_missing',
            paymentId: null,
            status: 'FAILED',
            processedAt: new Date(),
            reason: data.reason,
        }),
    }, async () => {
        const result = await paymentService.processWebhookEvent('trusted-provider', Buffer.from('x'), {}, {
            name: 'trusted-provider',
            async authorize() { throw new Error('not used'); },
            async capture() { throw new Error('not used'); },
            async cancel() { throw new Error('not used'); },
            async refund() { throw new Error('not used'); },
            async getStatus() { throw new Error('not used'); },
            async verifyWebhook() {
                return {
                    provider: 'trusted-provider',
                    providerEventId: 'evt-999',
                    eventType: 'payment.succeeded',
                    providerPaymentId: 'pay_missing',
                    paymentStatus: PaymentStatus.CAPTURED,
                    occurredAt: new Date(),
                    safeMetadata: null,
                };
            },
        });

        assert.equal(result.acknowledged, false);
        assert.equal(result.retryable, true);
        assert.equal(result.event.status, 'FAILED');
    });
});

test('stale webhook event becomes IGNORED instead of regressing a payment', async () => {
    const payment = {
        id: 'pay-2',
        orderId: 'order-2',
        provider: 'trusted-provider',
        providerPaymentId: 'pay_abc',
        purpose: PaymentPurpose.SALE,
        status: PaymentStatus.CAPTURED,
        amount: '100.00',
        currency: 'USD',
        metadata: null,
    };

    await withPaymentStubs({
        claimWebhookEvent: async () => ({
            event: { id: 'webhook-3', provider: 'trusted-provider', providerEventId: 'evt-444', eventType: 'payment.succeeded', providerPaymentId: 'pay_abc', paymentId: 'pay-2', status: 'PROCESSING', processedAt: null, reason: null },
            claimed: true,
            created: true,
            state: 'claimed',
        }),
        findPaymentByProviderReference: async () => payment,
        finalizeWebhookTransition: async (id, paymentId, data) => {
            assert.equal(id, 'webhook-3');
            assert.equal(paymentId, 'pay-2');
            assert.equal(data.paymentStatus, PaymentStatus.CAPTURED);
            assert.equal(data.finalEventStatus, 'IGNORED');
            assert.equal(data.providerPaymentId, 'pay_abc');

            return {
                payment,
                event: {
                    id,
                    provider: 'trusted-provider',
                    providerEventId: 'evt-444',
                    eventType: 'payment.succeeded',
                    providerPaymentId: 'pay_abc',
                    paymentId: 'pay-2',
                    status: 'IGNORED',
                    processedAt: new Date(),
                    reason: data.reason,
                },
            };
        },
    }, async () => {
        const result = await paymentService.processWebhookEvent('trusted-provider', Buffer.from('{}'), {}, {
            name: 'trusted-provider',
            async authorize() { throw new Error('not used'); },
            async capture() { throw new Error('not used'); },
            async cancel() { throw new Error('not used'); },
            async refund() { throw new Error('not used'); },
            async getStatus() { throw new Error('not used'); },
            async verifyWebhook() {
                return {
                    provider: 'trusted-provider',
                    providerEventId: 'evt-444',
                    eventType: 'payment.succeeded',
                    providerPaymentId: 'pay_abc',
                    paymentStatus: PaymentStatus.AUTHORIZED,
                    occurredAt: new Date(),
                    safeMetadata: null,
                };
            },
        });

        assert.equal(result.acknowledged, true);
        assert.equal(result.event.status, 'IGNORED');
        assert.equal(result.payment.status, PaymentStatus.CAPTURED);
    });
});

test('duplicate and already-final webhook events do not mutate the local payment twice', async () => {
    const payment = {
        id: 'pay-duplicate-final',
        orderId: 'order-duplicate-final',
        provider: 'trusted-provider',
        providerPaymentId: 'pay_duplicate_final',
        purpose: PaymentPurpose.SALE,
        status: PaymentStatus.CAPTURED,
        amount: '100.00',
        currency: 'USD',
        metadata: null,
    };

    let finalizeCalls = 0;

    await withPaymentStubs({
        claimWebhookEvent: async () => ({
            event: { id: 'webhook-duplicate', provider: 'trusted-provider', providerEventId: 'evt-duplicate', eventType: 'payment.succeeded', providerPaymentId: 'pay_duplicate_final', paymentId: payment.id, status: 'PROCESSED', processedAt: new Date(), reason: null },
            claimed: false,
            created: false,
            state: 'duplicate',
        }),
        findPaymentById: async () => payment,
        findPaymentByProviderReference: async () => payment,
        finalizeWebhookTransition: async () => {
            finalizeCalls += 1;
            return { payment, event: { id: 'webhook-duplicate', status: 'PROCESSED' } };
        },
    }, async () => {
        const result = await paymentService.processWebhookEvent('trusted-provider', Buffer.from('{}'), {}, {
            name: 'trusted-provider',
            async authorize() { throw new Error('not used'); },
            async capture() { throw new Error('not used'); },
            async cancel() { throw new Error('not used'); },
            async refund() { throw new Error('not used'); },
            async getStatus() { throw new Error('not used'); },
            async verifyWebhook() {
                return {
                    provider: 'trusted-provider',
                    providerEventId: 'evt-duplicate',
                    eventType: 'payment.succeeded',
                    providerPaymentId: 'pay_duplicate_final',
                    paymentStatus: PaymentStatus.CAPTURED,
                    occurredAt: new Date(),
                    safeMetadata: null,
                };
            },
        });

        assert.equal(result.idempotent, true);
        assert.equal(result.payment.status, PaymentStatus.CAPTURED);
        assert.equal(finalizeCalls, 0);
    });

    await withPaymentStubs({
        claimWebhookEvent: async () => ({
            event: { id: 'webhook-already-final', provider: 'trusted-provider', providerEventId: 'evt-already-final', eventType: 'payment.succeeded', providerPaymentId: 'pay_duplicate_final', paymentId: payment.id, status: 'PROCESSING', processedAt: null, reason: null },
            claimed: true,
            created: true,
            state: 'claimed',
        }),
        findPaymentByProviderReference: async () => payment,
        finalizeWebhookTransition: async () => {
            finalizeCalls += 1;
            return { payment, event: { id: 'webhook-already-final', status: 'PROCESSED' } };
        },
    }, async () => {
        const result = await paymentService.processWebhookEvent('trusted-provider', Buffer.from('{}'), {}, {
            name: 'trusted-provider',
            async authorize() { throw new Error('not used'); },
            async capture() { throw new Error('not used'); },
            async cancel() { throw new Error('not used'); },
            async refund() { throw new Error('not used'); },
            async getStatus() { throw new Error('not used'); },
            async verifyWebhook() {
                return {
                    provider: 'trusted-provider',
                    providerEventId: 'evt-already-final',
                    eventType: 'payment.succeeded',
                    providerPaymentId: 'pay_duplicate_final',
                    paymentStatus: PaymentStatus.CAPTURED,
                    occurredAt: new Date(),
                    safeMetadata: null,
                };
            },
        });

        assert.equal(result.acknowledged, true);
        assert.equal(result.payment.status, PaymentStatus.CAPTURED);
        assert.equal(finalizeCalls, 1);
    });
});

test('retryable webhook failure can be retried without regressing payment state', async () => {
    await withPaymentStubs({
        claimWebhookEvent: async () => ({
            event: {
                id: 'webhook-retry',
                provider: 'trusted-provider',
                providerEventId: 'evt-retry',
                eventType: 'payment.succeeded',
                providerPaymentId: 'pay_retryable',
                paymentId: null,
                status: 'PROCESSING',
                processedAt: null,
                reason: null,
            },
            claimed: true,
            created: true,
            state: 'claimed',
        }),

        findPaymentByProviderReference: async () => null,

        updateWebhookEventStatus: async (_, payload) => ({
            id: 'webhook-retry',
            provider: 'trusted-provider',
            providerEventId: 'evt-retry',
            eventType: 'payment.succeeded',
            providerPaymentId: 'pay_retryable',
            paymentId: null,
            status: 'FAILED',
            processedAt: new Date(),
            reason: payload.reason,
        }),
    }, async () => {
        const result = await paymentService.processWebhookEvent(
            'trusted-provider',
            Buffer.from('{}'),
            {},
            {
                name: 'trusted-provider',
                async authorize() { throw new Error('not used'); },
                async capture() { throw new Error('not used'); },
                async cancel() { throw new Error('not used'); },
                async refund() { throw new Error('not used'); },
                async getStatus() { throw new Error('not used'); },
                async verifyWebhook() {
                    return {
                        provider: 'trusted-provider',
                        providerEventId: 'evt-retry',
                        eventType: 'payment.succeeded',
                        providerPaymentId: 'pay_retryable',
                        paymentStatus: PaymentStatus.CAPTURED,
                        occurredAt: new Date(),
                        safeMetadata: null,
                    };
                },
            }
        );

        assert.equal(result.acknowledged, false);
        assert.equal(result.retryable, true);
        assert.equal(result.event.status, 'FAILED');
    });
});

test('unknown provider is rejected before processing', async () => {
    await assert.rejects(
        () => paymentService.processWebhookEvent('unknown-provider', Buffer.from('{}'), {}, {
            name: 'trusted-provider',
            async authorize() { throw new Error('not used'); },
            async capture() { throw new Error('not used'); },
            async cancel() { throw new Error('not used'); },
            async refund() { throw new Error('not used'); },
            async getStatus() { throw new Error('not used'); },
            async verifyWebhook() { throw new Error('not used'); },
        }),
        (error) => error.statusCode === 404 && /not configured/i.test(error.message)
    );
});
