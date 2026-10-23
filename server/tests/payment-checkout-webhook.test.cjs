require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { PaymentPurpose, PaymentStatus } = require('../src/generated/prisma');
const orderRepository = require('../src/repositories/order.repository.ts');
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

test('SALE checkout fails cleanly when the persisted currency is missing', async () => {
    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-sale',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'SALE',
            unitPrice: '100.00',
            quantity: 1,
        }),
    }, async () => {
        await assert.rejects(
            () => paymentService.authorizeOrderPayment('order-sale', 'buyer-1', unsupportedProvider),
            (error) => error.statusCode === 409 && /persisted order currency is missing/i.test(error.message)
        );
    });
});

test('RENT checkout fails cleanly when the pricing and currency contract is missing', async () => {
    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-rent',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'RENT',
            unitPrice: '50.00',
            quantity: 3,
        }),
    }, async () => {
        await assert.rejects(
            () => paymentService.authorizeOrderPayment('order-rent', 'buyer-1', unsupportedProvider),
            (error) => error.statusCode === 409 && /rental total|pricing contract|currency/i.test(error.message)
        );
    });
});

test('RENT_DEPOSIT cannot be initiated by the checkout service contract', async () => {
    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-deposit',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'RENT',
            unitPrice: '50.00',
            quantity: 2,
        }),
    }, async () => {
        await assert.rejects(
            () => paymentService.authorizeOrderPayment('order-deposit', 'buyer-1', unsupportedProvider),
            (error) => error.statusCode === 409 && /rental total|pricing contract|currency/i.test(error.message)
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
