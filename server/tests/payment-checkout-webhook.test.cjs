require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { Prisma, PaymentPurpose, PaymentStatus } = require('../src/generated/prisma'); const orderRepository = require('../src/repositories/order.repository.ts');
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
            compareAndSwapPaymentStatus: async (
                id,
                expectedStatus,
                status,
                data = {}
            ) => {
                const payment = state.byId.get(id);

                if (!payment) {
                    throw new Error('Payment not found');
                }

                if (payment.status !== expectedStatus) {
                    return null;
                }

                payment.status = status;

                if (data.provider !== undefined) {
                    payment.provider = data.provider;
                }

                if (data.providerPaymentId !== undefined) {
                    payment.providerPaymentId = data.providerPaymentId;
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

test('checkout authorization returns client secret while payment remains PROCESSING', async () => {
    const harness = createCheckoutPaymentHarness();

    let authorizeCalls = 0;

    const provider = {
        name: 'stripe',

        async authorize() {
            authorizeCalls += 1;

            return {
                provider: 'stripe',
                providerPaymentId: 'pi_checkout_processing',
                status: PaymentStatus.PROCESSING,
                clientSecret:
                    'pi_checkout_processing_secret_123',
                metadata: {
                    stripePaymentIntentStatus:
                        'requires_action',
                },
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
            id: 'order-checkout-processing',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'SALE',
            unitPrice: new Prisma.Decimal('100.00'),
            quantity: 1,
            currency: 'CAD',
            subtotal: new Prisma.Decimal('100.00'),
            rentalDays: null,
            rentalDepositAmount: null,
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                const result =
                    await paymentService.authorizeOrderPayment(
                        'order-checkout-processing',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.status,
                    PaymentStatus.PROCESSING
                );

                assert.equal(
                    result.provider,
                    'stripe'
                );

                assert.equal(
                    result.providerPaymentId,
                    'pi_checkout_processing'
                );

                assert.equal(
                    result.clientSecret,
                    'pi_checkout_processing_secret_123'
                );

                assert.equal(authorizeCalls, 1);

                const persisted =
                    harness.state.byId.get(result.id);

                assert.equal(
                    persisted.status,
                    PaymentStatus.PROCESSING
                );

                assert.equal(
                    persisted.providerPaymentId,
                    'pi_checkout_processing'
                );

                assert.equal(
                    persisted.clientSecret,
                    undefined
                );
            }
        );
    });
});

test('repeated checkout authorization recovers client secret for PROCESSING payment without reauthorizing', async () => {
    const harness = createCheckoutPaymentHarness();

    harness.store({
        id: 'payment-processing-refresh',
        orderId: 'order-processing-refresh',
        purpose: PaymentPurpose.SALE,
        provider: 'stripe',
        providerPaymentId: 'pi_processing_refresh',
        amount: new Prisma.Decimal('75.00'),
        currency: 'CAD',
        status: PaymentStatus.PROCESSING,
        idempotencyKey:
            `order-processing-refresh:${PaymentPurpose.SALE}`,
        metadata: {
            stripePaymentIntentStatus:
                'requires_action',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    let authorizeCalls = 0;
    let getStatusCalls = 0;

    const provider = {
        name: 'stripe',

        async authorize() {
            authorizeCalls += 1;
            throw new Error(
                'authorize should not be called'
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

        async getStatus(providerPaymentId) {
            getStatusCalls += 1;

            assert.equal(
                providerPaymentId,
                'pi_processing_refresh'
            );

            return {
                provider: 'stripe',
                providerPaymentId:
                    'pi_processing_refresh',
                status: PaymentStatus.PROCESSING,
                clientSecret:
                    'pi_processing_refresh_secret_123',
                metadata: {
                    stripePaymentIntentStatus:
                        'requires_action',
                },
            };
        },

        async verifyWebhook() {
            throw new Error('not used');
        },
    };

    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-processing-refresh',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'SALE',
            unitPrice: new Prisma.Decimal('75.00'),
            quantity: 1,
            currency: 'CAD',
            subtotal: new Prisma.Decimal('75.00'),
            rentalDays: null,
            rentalDepositAmount: null,
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                const result =
                    await paymentService.authorizeOrderPayment(
                        'order-processing-refresh',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.status,
                    PaymentStatus.PROCESSING
                );

                assert.equal(
                    result.clientSecret,
                    'pi_processing_refresh_secret_123'
                );

                assert.equal(authorizeCalls, 0);
                assert.equal(getStatusCalls, 1);
            }
        );
    });
});

test('repeated checkout authorization syncs PROCESSING payment to AUTHORIZED after Stripe confirmation', async () => {
    const harness = createCheckoutPaymentHarness();

    harness.store({
        id: 'payment-processing-authorized',
        orderId: 'order-processing-authorized',
        purpose: PaymentPurpose.SALE,
        provider: 'stripe',
        providerPaymentId:
            'pi_processing_authorized',
        amount: new Prisma.Decimal('125.00'),
        currency: 'CAD',
        status: PaymentStatus.PROCESSING,
        idempotencyKey:
            `order-processing-authorized:${PaymentPurpose.SALE}`,
        metadata: {
            stripePaymentIntentStatus:
                'requires_action',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    let authorizeCalls = 0;
    let getStatusCalls = 0;

    const provider = {
        name: 'stripe',

        async authorize() {
            authorizeCalls += 1;
            throw new Error(
                'authorize should not be called'
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

        async getStatus(providerPaymentId) {
            getStatusCalls += 1;

            assert.equal(
                providerPaymentId,
                'pi_processing_authorized'
            );

            return {
                provider: 'stripe',
                providerPaymentId:
                    'pi_processing_authorized',
                status: PaymentStatus.AUTHORIZED,
                clientSecret:
                    'pi_processing_authorized_secret_123',
                metadata: {
                    stripePaymentIntentStatus:
                        'requires_capture',
                },
            };
        },

        async verifyWebhook() {
            throw new Error('not used');
        },
    };

    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-processing-authorized',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'SALE',
            unitPrice: new Prisma.Decimal('125.00'),
            quantity: 1,
            currency: 'CAD',
            subtotal: new Prisma.Decimal('125.00'),
            rentalDays: null,
            rentalDepositAmount: null,
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                const result =
                    await paymentService.authorizeOrderPayment(
                        'order-processing-authorized',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.status,
                    PaymentStatus.AUTHORIZED
                );

                assert.equal(
                    result.clientSecret,
                    'pi_processing_authorized_secret_123'
                );

                assert.equal(authorizeCalls, 0);
                assert.equal(getStatusCalls, 1);

                const persisted =
                    harness.state.byId.get(
                        'payment-processing-authorized'
                    );

                assert.equal(
                    persisted.status,
                    PaymentStatus.AUTHORIZED
                );

                assert.equal(
                    persisted.clientSecret,
                    undefined
                );
            }
        );
    });
});

test('rental deposit authorization uses the immutable order deposit amount and currency', async () => {
    const harness = createCheckoutPaymentHarness();

    let providerInput = null;

    const provider = {
        name: 'mock-provider',

        async authorize(input) {
            providerInput = input;

            return {
                provider: 'mock-provider',
                providerPaymentId: 'deposit-provider-payment',
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
            id: 'order-deposit',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'RENT',

            unitPrice: new Prisma.Decimal('150.00'),
            quantity: 2,

            currency: 'CAD',
            subtotal: new Prisma.Decimal('900.00'),

            rentalDays: 3,
            rentalDepositAmount:
                new Prisma.Decimal('150.00'),
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                const result =
                    await paymentService.authorizeRentalDeposit(
                        'order-deposit',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.status,
                    PaymentStatus.AUTHORIZED
                );

                assert.equal(
                    result.purpose,
                    PaymentPurpose.RENT_DEPOSIT
                );

                assert.equal(
                    result.amount.toString(),
                    '150'
                );

                assert.equal(result.currency, 'CAD');

                assert.equal(
                    providerInput.purpose,
                    PaymentPurpose.RENT_DEPOSIT
                );

                assert.equal(
                    providerInput.amount.toString(),
                    '150'
                );

                assert.equal(
                    providerInput.currency,
                    'CAD'
                );
            }
        );
    });
});

test('rental deposit authorization rejects zero deposit orders without creating a payment', async () => {
    const harness = createCheckoutPaymentHarness();

    let authorizeCalls = 0;

    const provider = {
        name: 'mock-provider',

        async authorize() {
            authorizeCalls += 1;
            throw new Error('provider should not be called');
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
            id: 'order-zero-deposit',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'RENT',

            unitPrice: new Prisma.Decimal('150.00'),
            quantity: 1,

            currency: 'CAD',
            subtotal: new Prisma.Decimal('450.00'),

            rentalDays: 3,
            rentalDepositAmount:
                new Prisma.Decimal('0.00'),
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                await assert.rejects(
                    () =>
                        paymentService.authorizeRentalDeposit(
                            'order-zero-deposit',
                            'buyer-1',
                            provider
                        ),
                    (error) =>
                        error.statusCode === 409 &&
                        /does not require a deposit/i.test(
                            error.message
                        )
                );

                assert.equal(
                    harness.state.byId.size,
                    0
                );

                assert.equal(authorizeCalls, 0);
            }
        );
    });
});

test('SALE orders cannot authorize rental deposits', async () => {
    const harness = createCheckoutPaymentHarness();

    let authorizeCalls = 0;

    const provider = {
        name: 'mock-provider',

        async authorize() {
            authorizeCalls += 1;
            throw new Error('provider should not be called');
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
            id: 'sale-order-deposit',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'SALE',

            unitPrice: new Prisma.Decimal('100.00'),
            quantity: 1,

            currency: 'CAD',
            subtotal: new Prisma.Decimal('100.00'),

            rentalDays: null,
            rentalDepositAmount: null,
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                await assert.rejects(
                    () =>
                        paymentService.authorizeRentalDeposit(
                            'sale-order-deposit',
                            'buyer-1',
                            provider
                        ),
                    (error) =>
                        error.statusCode === 409 &&
                        /only valid for RENT orders/i.test(
                            error.message
                        )
                );

                assert.equal(
                    harness.state.byId.size,
                    0
                );

                assert.equal(authorizeCalls, 0);
            }
        );
    });
});

test('buyer ownership is enforced for rental deposit authorization', async () => {
    const harness = createCheckoutPaymentHarness();

    let authorizeCalls = 0;
    let getStatusCalls = 0;

    const provider = {
        name: 'stripe',

        async authorize() {
            authorizeCalls += 1;
            throw new Error('provider should not be called');
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
            getStatusCalls += 1;
            throw new Error('provider should not be called');
        },

        async verifyWebhook() {
            throw new Error('not used');
        },
    };

    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-buyer-enforced',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'RENT',

            unitPrice: new Prisma.Decimal('150.00'),
            quantity: 1,

            currency: 'CAD',
            subtotal: new Prisma.Decimal('450.00'),

            rentalDays: 3,
            rentalDepositAmount: new Prisma.Decimal('150.00'),
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                await assert.rejects(
                    () =>
                        paymentService.authorizeRentalDeposit(
                            'order-buyer-enforced',
                            'buyer-2',
                            provider
                        ),
                    (error) =>
                        error.statusCode === 403 &&
                        /not authorized|authorized/i.test(
                            error.message
                        )
                );

                assert.equal(harness.state.byId.size, 0);
                assert.equal(authorizeCalls, 0);
                assert.equal(getStatusCalls, 0);
            }
        );
    });
});

test('first rental deposit authorization can return PROCESSING with a client secret', async () => {
    const harness = createCheckoutPaymentHarness();

    let authorizeCalls = 0;

    const provider = {
        name: 'stripe',

        async authorize(input) {
            authorizeCalls += 1;

            assert.equal(input.orderId, 'order-processing-init');
            assert.equal(input.purpose, PaymentPurpose.RENT_DEPOSIT);
            assert.equal(input.amount.toString(), '150');
            assert.equal(input.currency, 'CAD');

            return {
                provider: 'stripe',
                providerPaymentId: 'deposit-processing-provider-payment',
                status: PaymentStatus.PROCESSING,
                clientSecret: 'pi_secret_processing_init',
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
            id: 'order-processing-init',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'RENT',

            unitPrice: new Prisma.Decimal('150.00'),
            quantity: 1,

            currency: 'CAD',
            subtotal: new Prisma.Decimal('450.00'),

            rentalDays: 3,
            rentalDepositAmount: new Prisma.Decimal('150.00'),
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                const result =
                    await paymentService.authorizeRentalDeposit(
                        'order-processing-init',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.status,
                    PaymentStatus.PROCESSING
                );

                assert.equal(
                    result.clientSecret,
                    'pi_secret_processing_init'
                );

                assert.equal(authorizeCalls, 1);
                assert.equal(harness.state.byId.size, 1);

                const payment = harness.state.byId.values().next().value;
                assert.equal(
                    payment.purpose,
                    PaymentPurpose.RENT_DEPOSIT
                );
                assert.equal(payment.amount.toString(), '150');
                assert.equal(payment.currency, 'CAD');
                assert.equal(payment.provider, 'stripe');
                assert.equal(
                    payment.providerPaymentId,
                    'deposit-processing-provider-payment'
                );
                assert.equal(
                    Object.prototype.hasOwnProperty.call(
                        payment,
                        'clientSecret'
                    ),
                    false
                );
            }
        );
    });
});

test('repeated PROCESSING rental deposit authorization returns the transient client secret without reauthorizing', async () => {
    const harness = createCheckoutPaymentHarness();

    let authorizeCalls = 0;
    let getStatusCalls = 0;

    const existing = harness.store({
        id: 'deposit-processing-existing',
        orderId: 'order-processing-repeat',
        purpose: PaymentPurpose.RENT_DEPOSIT,
        provider: 'stripe',
        providerPaymentId: 'existing-processing-provider-payment',
        amount: new Prisma.Decimal('150.00'),
        currency: 'CAD',
        status: PaymentStatus.PROCESSING,
        idempotencyKey:
            `order-processing-repeat:${PaymentPurpose.RENT_DEPOSIT}`,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const provider = {
        name: 'stripe',

        async authorize() {
            authorizeCalls += 1;
            throw new Error('provider should not be called');
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

        async getStatus(providerPaymentId, orderId) {
            getStatusCalls += 1;
            assert.equal(providerPaymentId, 'existing-processing-provider-payment');
            assert.equal(orderId, 'order-processing-repeat');

            return {
                provider: 'stripe',
                providerPaymentId,
                status: PaymentStatus.PROCESSING,
                clientSecret: 'pi_secret_processing_repeat',
                metadata: null,
            };
        },

        async verifyWebhook() {
            throw new Error('not used');
        },
    };

    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-processing-repeat',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'RENT',

            unitPrice: new Prisma.Decimal('150.00'),
            quantity: 1,

            currency: 'CAD',
            subtotal: new Prisma.Decimal('450.00'),

            rentalDays: 3,
            rentalDepositAmount: new Prisma.Decimal('150.00'),
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                const result =
                    await paymentService.authorizeRentalDeposit(
                        'order-processing-repeat',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.status,
                    PaymentStatus.PROCESSING
                );

                assert.equal(
                    result.clientSecret,
                    'pi_secret_processing_repeat'
                );

                assert.equal(authorizeCalls, 0);
                assert.equal(getStatusCalls, 1);

                const payment = harness.state.byId.get(existing.id);
                assert.equal(payment.status, PaymentStatus.PROCESSING);
                assert.equal(
                    Object.prototype.hasOwnProperty.call(
                        payment,
                        'clientSecret'
                    ),
                    false
                );
            }
        );
    });
});

test('repeated PROCESSING rental deposit authorization can sync to AUTHORIZED', async () => {
    const harness = createCheckoutPaymentHarness();

    let authorizeCalls = 0;
    let getStatusCalls = 0;

    const existing = harness.store({
        id: 'deposit-processing-sync-authorized',
        orderId: 'order-processing-sync',
        purpose: PaymentPurpose.RENT_DEPOSIT,
        provider: 'stripe',
        providerPaymentId: 'existing-processing-sync-provider-payment',
        amount: new Prisma.Decimal('150.00'),
        currency: 'CAD',
        status: PaymentStatus.PROCESSING,
        idempotencyKey:
            `order-processing-sync:${PaymentPurpose.RENT_DEPOSIT}`,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const provider = {
        name: 'stripe',

        async authorize() {
            authorizeCalls += 1;
            throw new Error('provider should not be called');
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

        async getStatus(providerPaymentId) {
            getStatusCalls += 1;
            assert.equal(providerPaymentId, 'existing-processing-sync-provider-payment');

            return {
                provider: 'stripe',
                providerPaymentId,
                status: PaymentStatus.AUTHORIZED,
                metadata: null,
            };
        },

        async verifyWebhook() {
            throw new Error('not used');
        },
    };

    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-processing-sync',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'RENT',

            unitPrice: new Prisma.Decimal('150.00'),
            quantity: 1,

            currency: 'CAD',
            subtotal: new Prisma.Decimal('450.00'),

            rentalDays: 3,
            rentalDepositAmount: new Prisma.Decimal('150.00'),
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                const result =
                    await paymentService.authorizeRentalDeposit(
                        'order-processing-sync',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.status,
                    PaymentStatus.AUTHORIZED
                );

                assert.equal(result.clientSecret, null);
                assert.equal(authorizeCalls, 0);
                assert.equal(getStatusCalls, 1);

                const payment = harness.state.byId.get(existing.id);
                assert.equal(payment.status, PaymentStatus.AUTHORIZED);
                assert.equal(
                    Object.prototype.hasOwnProperty.call(
                        payment,
                        'clientSecret'
                    ),
                    false
                );
            }
        );
    });
});

test('existing AUTHORIZED rental deposit is idempotent', async () => {
    const harness = createCheckoutPaymentHarness();

    let authorizeCalls = 0;
    let getStatusCalls = 0;

    const existing = harness.store({
        id: 'deposit-authorized-existing',
        orderId: 'order-authorized-existing',
        purpose: PaymentPurpose.RENT_DEPOSIT,
        provider: 'stripe',
        providerPaymentId: 'existing-authorized-provider-payment',
        amount: new Prisma.Decimal('150.00'),
        currency: 'CAD',
        status: PaymentStatus.AUTHORIZED,
        idempotencyKey:
            `order-authorized-existing:${PaymentPurpose.RENT_DEPOSIT}`,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    const provider = {
        name: 'stripe',

        async authorize() {
            authorizeCalls += 1;
            throw new Error('provider should not be called');
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
            getStatusCalls += 1;
            throw new Error('provider should not be called');
        },

        async verifyWebhook() {
            throw new Error('not used');
        },
    };

    await withOrderStubs({
        findOrderById: async () => ({
            id: 'order-authorized-existing',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
            transactionType: 'RENT',

            unitPrice: new Prisma.Decimal('150.00'),
            quantity: 1,

            currency: 'CAD',
            subtotal: new Prisma.Decimal('450.00'),

            rentalDays: 3,
            rentalDepositAmount: new Prisma.Decimal('150.00'),
        }),
    }, async () => {
        await withPaymentStubs(
            harness.stubs,
            async () => {
                const result =
                    await paymentService.authorizeRentalDeposit(
                        'order-authorized-existing',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.id,
                    existing.id
                );

                assert.equal(
                    result.status,
                    PaymentStatus.AUTHORIZED
                );

                assert.equal(result.clientSecret, null);
                assert.equal(authorizeCalls, 0);
                assert.equal(getStatusCalls, 0);

                const payment = harness.state.byId.get(existing.id);
                assert.equal(payment.status, PaymentStatus.AUTHORIZED);
                assert.equal(
                    Object.prototype.hasOwnProperty.call(
                        payment,
                        'clientSecret'
                    ),
                    false
                );
            }
        );
    });
});

test('repeated rental deposit authorization returns the existing authorized deposit', async () => {
    const harness = createCheckoutPaymentHarness();

    harness.store({
        id: 'deposit-existing',
        orderId: 'order-repeat-deposit',
        purpose: PaymentPurpose.RENT_DEPOSIT,
        provider: 'mock-provider',
        providerPaymentId: 'existing-deposit-provider-payment',
        amount: new Prisma.Decimal('150.00'),
        currency: 'CAD',
        status: PaymentStatus.AUTHORIZED,
        idempotencyKey:
            `order-repeat-deposit:${PaymentPurpose.RENT_DEPOSIT}`,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    let authorizeCalls = 0;

    const provider = {
        name: 'mock-provider',

        async authorize() {
            authorizeCalls += 1;
            throw new Error('provider should not be called');
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
            id: 'order-repeat-deposit',
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
                    await paymentService.authorizeRentalDeposit(
                        'order-repeat-deposit',
                        'buyer-1',
                        provider
                    );

                assert.equal(
                    result.id,
                    'deposit-existing'
                );

                assert.equal(
                    result.status,
                    PaymentStatus.AUTHORIZED
                );

                assert.equal(
                    result.purpose,
                    PaymentPurpose.RENT_DEPOSIT
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

test('CAPTURED payment processes partial refund then refund webhooks idempotently', async () => {
    const userRealtimePublisher = require('../src/utils/userRealtimePublisher.ts');
    const originalPublishOrderChanged = userRealtimePublisher.publishOrderChanged;
    const publishCalls = [];
    userRealtimePublisher.publishOrderChanged = (...args) => {
        publishCalls.push(args);
    };

    try {
        const payment = {
            id: 'pay-p6e-refunds',
            orderId: 'order-p6e-refunds',
            provider: 'trusted-provider',
            providerPaymentId: 'pay_p6e_refunds',
            purpose: PaymentPurpose.SALE,
            status: PaymentStatus.CAPTURED,
            amount: new Prisma.Decimal('100.00'),
            currency: 'USD',
            metadata: null,
            order: { buyerId: 'buyer-p6e', sellerId: 'seller-p6e' },
        };

        const events = new Map();
        let paymentMutationCount = 0;

        await withPaymentStubs({
            claimWebhookEvent: async (provider, providerEventId, data) => {
                const existing = events.get(providerEventId);
                if (existing) {
                    return {
                        event: existing,
                        claimed: false,
                        created: false,
                        state: 'duplicate',
                    };
                }

                const event = {
                    id: `webhook-${providerEventId}`,
                    provider,
                    providerEventId,
                    eventType: data.eventType,
                    providerPaymentId: data.providerPaymentId,
                    paymentId: payment.id,
                    status: 'PROCESSING',
                    processedAt: null,
                    reason: null,
                };
                events.set(providerEventId, event);
                return { event, claimed: true, created: true, state: 'claimed' };
            },
            findPaymentByProviderReference: async () => payment,
            findPaymentById: async () => payment,
            finalizeWebhookTransition: async (eventId, paymentId, data) => {
                assert.equal(paymentId, payment.id);

                paymentMutationCount += 1;
                payment.status = data.paymentStatus;

                const providerEventId = eventId === 'webhook-evt-p6e-partial'
                    ? 'evt-p6e-partial'
                    : 'evt-p6e-refunded';
                const event = events.get(providerEventId);
                event.status = data.finalEventStatus;
                event.processedAt = new Date();

                return {
                    payment,
                    event,
                    transitionApplied: true,
                };
            },
        }, async () => {
            const makeProvider = (providerEventId, paymentStatus) => ({
                name: 'trusted-provider',
                async authorize() { throw new Error('not used'); },
                async capture() { throw new Error('not used'); },
                async cancel() { throw new Error('not used'); },
                async refund() { throw new Error('not used'); },
                async getStatus() { throw new Error('not used'); },
                async verifyWebhook() {
                    return {
                        provider: 'trusted-provider',
                        providerEventId,
                        eventType: 'charge.refunded',
                        providerPaymentId: 'pay_p6e_refunds',
                        paymentStatus,
                        occurredAt: new Date(),
                        safeMetadata: null,
                    };
                },
            });

            const partial = await paymentService.processWebhookEvent(
                'trusted-provider',
                Buffer.from('{}'),
                {},
                makeProvider('evt-p6e-partial', PaymentStatus.PARTIALLY_REFUNDED)
            );

            assert.equal(partial.acknowledged, true);
            assert.equal(partial.transitionApplied, true);
            assert.equal(payment.status, PaymentStatus.PARTIALLY_REFUNDED);

            const refunded = await paymentService.processWebhookEvent(
                'trusted-provider',
                Buffer.from('{}'),
                {},
                makeProvider('evt-p6e-refunded', PaymentStatus.REFUNDED)
            );

            assert.equal(refunded.acknowledged, true);
            assert.equal(refunded.transitionApplied, true);
            assert.equal(payment.status, PaymentStatus.REFUNDED);

            assert.equal(paymentMutationCount, 2);
            assert.equal(publishCalls.length, 2);

            const duplicate = await paymentService.processWebhookEvent(
                'trusted-provider',
                Buffer.from('{}'),
                {},
                makeProvider('evt-p6e-refunded', PaymentStatus.REFUNDED)
            );

            assert.equal(duplicate.acknowledged, true);
            assert.equal(duplicate.idempotent, true);
            assert.equal(payment.status, PaymentStatus.REFUNDED);
            assert.equal(paymentMutationCount, 2);
            assert.equal(publishCalls.length, 2);
        });
    } finally {
        userRealtimePublisher.publishOrderChanged = originalPublishOrderChanged;
    }
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

test('stale direct capture and webhook capture cannot both persist the same payment transition', async () => {
    const userRealtimePublisher = require('../src/utils/userRealtimePublisher.ts');
    const originalPublishOrderChanged = userRealtimePublisher.publishOrderChanged;
    const publishCalls = [];
    userRealtimePublisher.publishOrderChanged = (...args) => {
        publishCalls.push(args);
    };

    try {
        const payment = {
            id: 'pay-race-direct-vs-webhook',
            orderId: 'order-race-direct-vs-webhook',
            purpose: PaymentPurpose.SALE,
            amount: new Prisma.Decimal('100.00'),
            currency: 'USD',
            status: PaymentStatus.AUTHORIZED,
            idempotencyKey: 'pay-race-direct-vs-webhook:key',
            provider: 'mock-provider',
            providerPaymentId: 'prov-race-direct-vs-webhook',
            metadata: null,
            order: { buyerId: 'buyer-race', sellerId: 'seller-race' },
        };

        let persistedStatus = PaymentStatus.AUTHORIZED;
        let successfulPersists = 0;
        let stateWriteInFlight = false;
        let barrierRelease;
        const barrier = new Promise((resolve) => {
            barrierRelease = resolve;
        });
        let barrierCount = 0;
        const waitForConcurrentState = async () => {
            barrierCount += 1;
            if (barrierCount === 2) {
                barrierRelease();
            }
            await barrier;
        };

        const provider = {
            name: 'mock-provider',
            async authorize() { throw new Error('not used'); },
            async capture() {
                return {
                    provider: 'mock-provider',
                    providerPaymentId: 'prov-race-direct-vs-webhook',
                    status: PaymentStatus.CAPTURED,
                    metadata: { captured: true },
                };
            },
            async cancel() { throw new Error('not used'); },
            async refund() { throw new Error('not used'); },
            async getStatus() { throw new Error('not used'); },
            async verifyWebhook() {
                return {
                    provider: 'mock-provider',
                    providerEventId: 'evt-race-direct-vs-webhook',
                    eventType: 'payment_intent.succeeded',
                    providerPaymentId: 'prov-race-direct-vs-webhook',
                    paymentStatus: PaymentStatus.CAPTURED,
                    occurredAt: new Date(),
                    safeMetadata: { source: 'race' },
                };
            },
        };

        await withPaymentStubs({
            findPaymentById: async () => ({ ...payment, status: persistedStatus, order: payment.order }),
            updatePaymentStatus: async (id, status, data = {}) => {
                if (stateWriteInFlight) {
                    return { ...payment, id, status: persistedStatus, provider: payment.provider, providerPaymentId: payment.providerPaymentId, metadata: payment.metadata, order: payment.order };
                }

                stateWriteInFlight = true;
                try {
                    if (persistedStatus !== PaymentStatus.AUTHORIZED) {
                        return { ...payment, id, status: persistedStatus, provider: payment.provider, providerPaymentId: payment.providerPaymentId, metadata: payment.metadata, order: payment.order };
                    }

                    persistedStatus = status;
                    successfulPersists += 1;
                    return {
                        ...payment,
                        id,
                        status,
                        provider: data.provider ?? payment.provider,
                        providerPaymentId: data.providerPaymentId ?? payment.providerPaymentId,
                        metadata: data.metadata ?? payment.metadata,
                        order: payment.order,
                    };
                } finally {
                    stateWriteInFlight = false;
                }
            },
            compareAndSwapPaymentStatus: async (id, expectedStatus, status, data = {}) => {
                await waitForConcurrentState();
                if (stateWriteInFlight) {
                    return null;
                }

                stateWriteInFlight = true;
                try {
                    if (persistedStatus !== expectedStatus) {
                        return null;
                    }

                    persistedStatus = status;
                    successfulPersists += 1;
                    return {
                        ...payment,
                        id,
                        status,
                        provider: data.provider ?? payment.provider,
                        providerPaymentId: data.providerPaymentId ?? payment.providerPaymentId,
                        metadata: data.metadata ?? payment.metadata,
                        order: payment.order,
                    };
                } finally {
                    stateWriteInFlight = false;
                }
            },
            claimWebhookEvent: async () => ({
                event: { id: 'evt-race-direct-vs-webhook', provider: 'mock-provider', providerEventId: 'evt-race-direct-vs-webhook', eventType: 'payment_intent.succeeded', providerPaymentId: 'prov-race-direct-vs-webhook', paymentId: payment.id, status: 'PROCESSING', processedAt: null, reason: null },
                claimed: true,
                created: true,
                state: 'claimed',
            }),
            findPaymentByProviderReference: async () => ({ ...payment, status: persistedStatus, order: payment.order }),
            finalizeWebhookTransition: async (eventId, paymentId, data) => {
                await waitForConcurrentState();
                if (stateWriteInFlight) {
                    return {
                        payment: { ...payment, status: persistedStatus, order: payment.order },
                        event: { id: eventId, status: 'IGNORED' },
                        transitionApplied: false,
                    };
                }

                stateWriteInFlight = true;
                try {
                    if (persistedStatus !== PaymentStatus.AUTHORIZED) {
                        return {
                            payment: { ...payment, status: persistedStatus, order: payment.order },
                            event: { id: eventId, status: 'IGNORED' },
                            transitionApplied: false,
                        };
                    }

                    persistedStatus = data.paymentStatus;
                    successfulPersists += 1;
                    return {
                        payment: {
                            ...payment,
                            id: paymentId,
                            status: data.paymentStatus,
                            provider: data.provider,
                            providerPaymentId: data.providerPaymentId,
                            metadata: data.metadata ?? payment.metadata,
                            order: payment.order,
                        },
                        event: { id: eventId, status: 'PROCESSED' },
                        transitionApplied: true,
                    };
                } finally {
                    stateWriteInFlight = false;
                }
            },
        }, async () => {
            const [directResult, webhookResult] = await Promise.all([
                paymentService.capturePayment(payment.id, provider),
                paymentService.processWebhookEvent('mock-provider', Buffer.from('{}'), {}, provider),
            ]);

            assert.equal(persistedStatus, PaymentStatus.CAPTURED);
            assert.ok(successfulPersists <= 1, `expected a single persisted transition, got ${successfulPersists}`);
            assert.ok(publishCalls.length <= 1, `expected a single order change notification, got ${publishCalls.length}`);
            assert.ok(!publishCalls.length || publishCalls[0][2] === 'order-race-direct-vs-webhook');


            const persistedResults = [directResult, webhookResult].filter((result) => {
                const status = result?.payment?.status ?? result?.status;
                return status === PaymentStatus.CAPTURED;
            });
            assert.ok(persistedResults.length >= 1, `expected at least one captured result, got ${persistedResults.length}`);
        });
    } finally {
        userRealtimePublisher.publishOrderChanged = originalPublishOrderChanged;
    }
});

test('stale concurrent webhook writers cannot both persist or duplicate order_changed notifications', async () => {
    const userRealtimePublisher = require('../src/utils/userRealtimePublisher.ts');
    const originalPublishOrderChanged = userRealtimePublisher.publishOrderChanged;
    const publishCalls = [];
    userRealtimePublisher.publishOrderChanged = (...args) => {
        publishCalls.push(args);
    };

    try {
        const payment = {
            id: 'pay-race-two-webhooks',
            orderId: 'order-race-two-webhooks',
            purpose: PaymentPurpose.SALE,
            amount: new Prisma.Decimal('100.00'),
            currency: 'USD',
            status: PaymentStatus.AUTHORIZED,
            idempotencyKey: 'pay-race-two-webhooks:key',
            provider: 'mock-provider',
            providerPaymentId: 'prov-race-two-webhooks',
            metadata: null,
            order: { buyerId: 'buyer-race-2', sellerId: 'seller-race-2' },
        };

        let persistedStatus = PaymentStatus.AUTHORIZED;
        let successfulPersists = 0;
        let barrierRelease;
        const barrier = new Promise((resolve) => {
            barrierRelease = resolve;
        });
        let barrierCount = 0;
        const waitForConcurrentState = async () => {
            barrierCount += 1;
            if (barrierCount === 2) {
                barrierRelease();
            }
            await barrier;
        };

        const provider = {
            name: 'mock-provider',
            async authorize() { throw new Error('not used'); },
            async capture() { throw new Error('not used'); },
            async cancel() { throw new Error('not used'); },
            async refund() { throw new Error('not used'); },
            async getStatus() { throw new Error('not used'); },
            async verifyWebhook(eventData) {
                return {
                    provider: 'mock-provider',
                    providerEventId: eventData.eventId,
                    eventType: 'payment_intent.succeeded',
                    providerPaymentId: 'prov-race-two-webhooks',
                    paymentStatus: PaymentStatus.CAPTURED,
                    occurredAt: new Date(),
                    safeMetadata: { source: 'race' },
                };
            },
        };

        await withPaymentStubs({
            findPaymentByProviderReference: async () => ({ ...payment, status: persistedStatus, order: payment.order }),
            claimWebhookEvent: async (_, providerEventId) => ({
                event: {
                    id: `evt-race-${providerEventId}`,
                    provider: 'mock-provider',
                    providerEventId,
                    eventType: 'payment_intent.succeeded',
                    providerPaymentId: 'prov-race-two-webhooks',
                    paymentId: payment.id,
                    status: 'PROCESSING',
                    processedAt: null,
                    reason: null,
                },
                claimed: true,
                created: true,
                state: 'claimed',
            }),
            finalizeWebhookTransition: async (eventId, paymentId, data) => {
                await waitForConcurrentState();
                if (persistedStatus !== PaymentStatus.AUTHORIZED) {
                    return {
                        payment: { ...payment, status: persistedStatus, order: payment.order },
                        event: { id: eventId, status: 'IGNORED' },
                        transitionApplied: false,
                    };
                }

                persistedStatus = data.paymentStatus;
                successfulPersists += 1;
                return {
                    payment: {
                        ...payment,
                        id: paymentId,
                        status: data.paymentStatus,
                        provider: data.provider,
                        providerPaymentId: data.providerPaymentId,
                        metadata: data.metadata ?? payment.metadata,
                        order: payment.order,
                    },
                    event: { id: eventId, status: 'PROCESSED' },
                    transitionApplied: true,
                };
            },
        }, async () => {
            const [first, second] = await Promise.all([
                paymentService.processWebhookEvent('mock-provider', Buffer.from('first'), {}, {
                    ...provider, verifyWebhook: async () => ({
                        provider: 'mock-provider',
                        providerEventId: 'evt-1',
                        eventType: 'payment_intent.succeeded',
                        providerPaymentId: 'prov-race-two-webhooks',
                        paymentStatus: PaymentStatus.CAPTURED,
                        occurredAt: new Date(),
                        safeMetadata: null,
                    })
                }),
                paymentService.processWebhookEvent('mock-provider', Buffer.from('second'), {}, {
                    ...provider, verifyWebhook: async () => ({
                        provider: 'mock-provider',
                        providerEventId: 'evt-2',
                        eventType: 'payment_intent.succeeded',
                        providerPaymentId: 'prov-race-two-webhooks',
                        paymentStatus: PaymentStatus.CAPTURED,
                        occurredAt: new Date(),
                        safeMetadata: null,
                    })
                }),
            ]);

            assert.equal(persistedStatus, PaymentStatus.CAPTURED);
            assert.ok(successfulPersists <= 1, `expected a single persisted transition, got ${successfulPersists}`);
            assert.ok(publishCalls.length <= 1, `expected a single order change notification, got ${publishCalls.length}`);
            assert.ok(!publishCalls.length || publishCalls[0][2] === 'order-race-two-webhooks');

            const transitionWins = [
                first?.transitionApplied ?? false,
                second?.transitionApplied ?? false,
            ].filter(Boolean).length;
            assert.equal(transitionWins, 1);

            const processedOutcomes = [first.event.status, second.event.status].filter((status) => status === 'PROCESSED');
        });
    } finally {
        userRealtimePublisher.publishOrderChanged = originalPublishOrderChanged;
    }
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
