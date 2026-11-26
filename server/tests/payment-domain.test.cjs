require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Module } = require('node:module');
const { Prisma, PaymentStatus, PaymentPurpose, ListingType, OrderStatus } = require('../src/generated/prisma');

const orderRepositoryId = require.resolve('../src/repositories/order.repository.ts');
const paymentRepositoryId = require.resolve('../src/repositories/payment.repository.ts');

const orders = new Map([
  ['sale-order', { id: 'sale-order', buyerId: 'buyer-1', transactionType: ListingType.SALE }],
  ['rent-order', { id: 'rent-order', buyerId: 'buyer-1', transactionType: ListingType.RENT }],
  ['capture-order', { id: 'capture-order', buyerId: 'buyer-1', transactionType: ListingType.SALE }],
  ['cancel-order', { id: 'cancel-order', buyerId: 'buyer-1', transactionType: ListingType.RENT }],
  ['refund-order', { id: 'refund-order', buyerId: 'buyer-1', transactionType: ListingType.SALE }],
  ['rent-order-hold', {
    id: 'rent-order-hold',
    buyerId: 'buyer-1',
    transactionType: ListingType.RENT,
    currency: 'USD',
    rentalDepositAmount: new Prisma.Decimal('25.00'),
  }],
  ['rent-order-capture', {
    id: 'rent-order-capture',
    buyerId: 'buyer-1',
    transactionType: ListingType.RENT,
    currency: 'USD',
    rentalDepositAmount: new Prisma.Decimal('40.00'),
  }],
  ['rent-order-release', {
    id: 'rent-order-release',
    buyerId: 'buyer-1',
    transactionType: ListingType.RENT,
    currency: 'USD',
    rentalDepositAmount: new Prisma.Decimal('35.00'),
  }],
]);

const orderRepositoryModule = new Module(orderRepositoryId);
orderRepositoryModule.exports = {
  findOrderById: async (id) => orders.get(id) ?? null,
};
require.cache[orderRepositoryId] = orderRepositoryModule;

const paymentRepositoryState = {
  created: [],
  byId: new Map(),
  byOrderAndPurpose: new Map(),
  byKey: new Map(),
};

const paymentRepositoryModule = new Module(paymentRepositoryId);
paymentRepositoryModule.exports = {
  findPaymentById: async (id) => paymentRepositoryState.byId.get(id) ?? null,
  findPaymentsByOrderId: async (orderId) =>
    paymentRepositoryState.created.filter((payment) => payment.orderId === orderId),
  findPaymentByOrderAndPurpose: async (orderId, purpose) =>
    paymentRepositoryState.byOrderAndPurpose.get(`${orderId}:${purpose}`) ?? null,
  findPaymentByIdempotencyKey: async (idempotencyKey) => paymentRepositoryState.byKey.get(idempotencyKey) ?? null,
  createPayment: async (data) => {
    const record = {
      id: `pay-${paymentRepositoryState.created.length + 1}`,
      orderId: data.orderId,
      purpose: data.purpose,
      provider: data.provider,
      providerPaymentId: data.providerPaymentId,
      amount: new Prisma.Decimal(data.amount.toString()),
      currency: data.currency,
      status: data.status,
      idempotencyKey: data.idempotencyKey,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    paymentRepositoryState.created.push(record);
    paymentRepositoryState.byId.set(record.id, record);
    paymentRepositoryState.byOrderAndPurpose.set(`${record.orderId}:${record.purpose}`, record);
    paymentRepositoryState.byKey.set(record.idempotencyKey, record);
    return record;
  },
  updatePaymentStatus: async (id, status, data = {}) => {
    const payment = paymentRepositoryState.byId.get(id);
    if (!payment) {
      throw new Error('Payment not found');
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
  compareAndSwapPaymentStatus: async (id, expectedStatus, status, data = {}) => {
    const payment = paymentRepositoryState.byId.get(id);
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
};
require.cache[paymentRepositoryId] = paymentRepositoryModule;

const {
  createPaymentRecord,
  authorizePayment,
  capturePayment,
  cancelPayment,
  refundPayment,
  syncPaymentStatus,
  syncOrderPaymentStatus,
  createPaymentForOrder,
  authorizeRentalDeposit,
  releaseRentalDeposit,
  captureRentalDeposit,
  settleCancelledOrderPayment,
  getSellerPayoutReadiness,
  captureRentalPaymentForStart,
} = require('../src/services/payment.service.ts');

const clearState = () => {
  paymentRepositoryState.created.length = 0;
  paymentRepositoryState.byId.clear();
  paymentRepositoryState.byOrderAndPurpose.clear();
  paymentRepositoryState.byKey.clear();
};

const makePaymentWithProvider = async (orderId, purpose, amount, currency, idempotencyKey, provider = 'mock-provider', providerPaymentId = 'provider-ref-1') => {
  const payment = await createPaymentRecord({ orderId, purpose, amount, currency, idempotencyKey });
  const updated = await paymentRepositoryModule.exports.updatePaymentStatus(payment.id, payment.status, {
    provider,
    providerPaymentId,
    metadata: { providerSet: true },
  });
  return updated;
};

const mockProvider = {
  authorize: async (input) => ({
    provider: 'mock-provider',
    providerPaymentId: `auth-${input.orderId}-${input.purpose}`,
    status: PaymentStatus.AUTHORIZED,
    metadata: { strategy: 'mock-authorize' },
  }),
  capture: async (input) => ({
    provider: 'mock-provider',
    providerPaymentId: input.providerPaymentId ?? `capture-${input.orderId}-${input.purpose}`,
    status: PaymentStatus.CAPTURED,
    metadata: { strategy: 'mock-capture' },
  }),
  cancel: async (input) => ({
    provider: 'mock-provider',
    providerPaymentId: input.providerPaymentId ?? `cancel-${input.orderId}-${input.purpose}`,
    status: PaymentStatus.CANCELLED,
    metadata: { strategy: 'mock-cancel' },
  }),
  refund: async (input) => ({
    provider: 'mock-provider',
    providerPaymentId: input.providerPaymentId ?? `refund-${input.orderId}-${input.purpose}`,
    status: PaymentStatus.REFUNDED,
    metadata: { strategy: 'mock-refund' },
  }),
  getStatus: async (providerPaymentId) => ({
    provider: 'mock-provider',
    providerPaymentId,
    status: PaymentStatus.CAPTURED,
    metadata: { strategy: 'mock-sync' },
  }),
};

test('SALE payment creation uses Decimal-safe amounts and explicit normalized currency', async () => {
  clearState();
  const result = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '19.99',
    currency: 'usd',
    idempotencyKey: 'sale-idem-1',
  });

  assert.equal(result.currency, 'USD');
  assert.ok(result.amount instanceof Prisma.Decimal);
  assert.equal(result.amount.toString(), '19.99');
  assert.equal(result.status, PaymentStatus.PENDING);
  assert.equal(result.purpose, PaymentPurpose.SALE);
});

test('RENT order can create both RENT and RENT_DEPOSIT records', async () => {
  clearState();
  const rent = await createPaymentRecord({
    orderId: 'rent-order',
    purpose: PaymentPurpose.RENT,
    amount: '100.00',
    currency: 'USD',
    idempotencyKey: 'rent-idem-1',
  });

  const deposit = await createPaymentRecord({
    orderId: 'rent-order',
    purpose: PaymentPurpose.RENT_DEPOSIT,
    amount: '25.00',
    currency: 'USD',
    idempotencyKey: 'rent-deposit-idem-1',
  });

  assert.equal(rent.purpose, PaymentPurpose.RENT);
  assert.equal(deposit.purpose, PaymentPurpose.RENT_DEPOSIT);
  assert.notEqual(rent.id, deposit.id);
});

test('duplicate same order + purpose is idempotent only when immutable details match', async () => {
  clearState();
  const first = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '42.00',
    currency: 'USD',
    idempotencyKey: 'sale-idem-2',
  });

  const duplicate = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '42.00',
    currency: 'USD',
    idempotencyKey: 'sale-idem-2',
  });

  assert.equal(first.id, duplicate.id);

  await assert.rejects(
    createPaymentRecord({
      orderId: 'sale-order',
      purpose: PaymentPurpose.SALE,
      amount: '43.00',
      currency: 'USD',
      idempotencyKey: 'sale-idem-2',
    }),
    (error) => error && error.statusCode === 409
  );
});

test('conflicting duplicate amount or currency for the same order + purpose is rejected', async () => {
  clearState();
  await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '20.00',
    currency: 'USD',
    idempotencyKey: 'sale-idem-3',
  });

  await assert.rejects(
    createPaymentRecord({
      orderId: 'sale-order',
      purpose: PaymentPurpose.SALE,
      amount: '20.00',
      currency: 'EUR',
      idempotencyKey: 'sale-idem-3',
    }),
    (error) => error && error.statusCode === 409
  );
});

test('same order cannot create duplicate purpose with a different idempotency key', async () => {
  clearState();
  await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '15.00',
    currency: 'USD',
    idempotencyKey: 'sale-idem-4',
  });

  await assert.rejects(
    createPaymentRecord({
      orderId: 'sale-order',
      purpose: PaymentPurpose.SALE,
      amount: '15.00',
      currency: 'USD',
      idempotencyKey: 'sale-idem-5',
    }),
    (error) => error && error.statusCode === 409
  );
});

test('same idempotency key cannot be reused for another order or purpose', async () => {
  clearState();
  await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '15.00',
    currency: 'USD',
    idempotencyKey: 'global-idem-1',
  });

  await assert.rejects(
    createPaymentRecord({
      orderId: 'rent-order',
      purpose: PaymentPurpose.RENT,
      amount: '15.00',
      currency: 'USD',
      idempotencyKey: 'global-idem-1',
    }),
    (error) => error && error.statusCode === 409
  );
});

test('invalid amounts and currency formats are rejected', async () => {
  clearState();
  await assert.rejects(
    createPaymentRecord({ orderId: 'sale-order', purpose: PaymentPurpose.SALE, amount: '0.00', currency: 'USD', idempotencyKey: 'sale-zero' }),
    (error) => error && error.statusCode === 400
  );

  await assert.rejects(
    createPaymentRecord({ orderId: 'sale-order', purpose: PaymentPurpose.SALE, amount: '-1.00', currency: 'USD', idempotencyKey: 'sale-neg' }),
    (error) => error && error.statusCode === 400
  );

  await assert.rejects(
    createPaymentRecord({ orderId: 'sale-order', purpose: PaymentPurpose.SALE, amount: '1.234', currency: 'USD', idempotencyKey: 'sale-malformed-amount' }),
    (error) => error && error.statusCode === 400
  );

  await assert.rejects(
    createPaymentRecord({ orderId: 'sale-order', purpose: PaymentPurpose.SALE, amount: '1.00', currency: 'US', idempotencyKey: 'sale-bad-currency' }),
    (error) => error && error.statusCode === 400
  );

  await assert.rejects(
    createPaymentRecord({ orderId: 'sale-order', purpose: PaymentPurpose.SALE, amount: '1.00', currency: '', idempotencyKey: 'sale-missing-currency' }),
    (error) => error && error.statusCode === 400
  );
});

test('purpose validation rejects disallowed order/purpose combinations', async () => {
  clearState();
  await assert.rejects(
    createPaymentRecord({ orderId: 'sale-order', purpose: PaymentPurpose.RENT, amount: '10.00', currency: 'USD', idempotencyKey: 'sale-bad-purpose' }),
    (error) => error && error.statusCode === 400
  );

  await assert.rejects(
    createPaymentRecord({ orderId: 'rent-order', purpose: PaymentPurpose.SALE, amount: '10.00', currency: 'USD', idempotencyKey: 'rent-bad-purpose' }),
    (error) => error && error.statusCode === 400
  );
});

test('valid status transitions are allowed and invalid ones are rejected', async () => {
  clearState();
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '50.00',
    currency: 'USD',
    idempotencyKey: 'sale-valid-transition',
  });

  const authorized = await authorizePayment(payment.id, mockProvider);
  assert.equal(authorized.status, PaymentStatus.AUTHORIZED);

  const captured = await capturePayment(authorized.id, mockProvider);
  assert.equal(captured.status, PaymentStatus.CAPTURED);

  await assert.rejects(
    cancelPayment(payment.id, mockProvider),
    (error) => error && error.statusCode === 409
  );
});

test('sync uses the persisted providerPaymentId and caller cannot substitute one', async () => {
  clearState();
  const payment = await makePaymentWithProvider('sale-order', PaymentPurpose.SALE, '33.00', 'USD', 'sale-sync-persisted', 'mock-provider', 'persisted-sync-ref');

  let calledWith = null;
  const provider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'persisted-sync-ref', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'persisted-sync-ref', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'persisted-sync-ref', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'persisted-sync-ref', status: PaymentStatus.REFUNDED }),
    getStatus: async (providerPaymentId) => {
      calledWith = providerPaymentId;
      assert.equal(providerPaymentId, 'persisted-sync-ref');
      return { provider: 'mock-provider', providerPaymentId, status: PaymentStatus.CAPTURED, metadata: { strategy: 'mock-sync' } };
    },
  };

  const synced = await syncPaymentStatus(payment.id, provider);
  assert.equal(calledWith, 'persisted-sync-ref');
  assert.equal(synced.status, PaymentStatus.CAPTURED);
});

test('sync with missing providerPaymentId does not call provider', async () => {
  clearState();
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '9.50',
    currency: 'USD',
    idempotencyKey: 'sale-sync-missing-ref',
  });

  let providerCalled = false;
  const provider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'missing-ref', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'missing-ref', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'missing-ref', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'missing-ref', status: PaymentStatus.REFUNDED }),
    getStatus: async () => {
      providerCalled = true;
      return { provider: 'mock-provider', providerPaymentId: 'missing-ref', status: PaymentStatus.CAPTURED };
    },
  };

  await assert.rejects(
    syncPaymentStatus(payment.id, provider),
    (error) => {
      assert.equal(providerCalled, false);
      return error && error.statusCode === 409;
    }
  );
});

test('authorize result without providerPaymentId is rejected and payment remains PENDING', async () => {
  clearState();
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '12.25',
    currency: 'USD',
    idempotencyKey: 'sale-authorization-no-ref',
  });

  const provider = {
    authorize: async () => ({ provider: 'mock-provider', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'capture-1', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'cancel-1', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'refund-1', status: PaymentStatus.REFUNDED }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'sync-1', status: PaymentStatus.CAPTURED }),
  };

  await assert.rejects(
    authorizePayment(payment.id, provider),
    (error) => error && error.statusCode === 409
  );

  const refreshed = await paymentRepositoryModule.exports.findPaymentById(payment.id);
  assert.equal(refreshed.status, PaymentStatus.PENDING);
});

test('authorize result without provider identity is rejected', async () => {
  clearState();
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '14.75',
    currency: 'USD',
    idempotencyKey: 'sale-authorization-no-provider',
  });

  const provider = {
    authorize: async () => ({ providerPaymentId: 'provider-ref-2', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'capture-1', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'cancel-1', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'refund-1', status: PaymentStatus.REFUNDED }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'sync-1', status: PaymentStatus.CAPTURED }),
  };

  await assert.rejects(
    authorizePayment(payment.id, provider),
    (error) => error && error.statusCode === 409
  );

  const refreshed = await paymentRepositoryModule.exports.findPaymentById(payment.id);
  assert.equal(refreshed.status, PaymentStatus.PENDING);
});

test('explicit refundPayment rejects PARTIALLY_REFUNDED and does not persist it', async () => {
  clearState();
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '80.00',
    currency: 'USD',
    idempotencyKey: 'sale-partial-refund-rejected',
  });

  const provider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-partial', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-partial', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-partial', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-partial', status: PaymentStatus.PARTIALLY_REFUNDED }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-partial', status: PaymentStatus.CAPTURED }),
  };

  const authorized = await authorizePayment(payment.id, provider);
  const captured = await capturePayment(authorized.id, provider);

  await assert.rejects(
    refundPayment(captured.id, provider),
    (error) => error && error.statusCode === 409
  );

  const refreshed = await paymentRepositoryModule.exports.findPaymentById(captured.id);
  assert.equal(refreshed.status, PaymentStatus.CAPTURED);
});

test('full REFUNDED result still works', async () => {
  clearState();
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '20.00',
    currency: 'USD',
    idempotencyKey: 'sale-full-refund-works',
  });

  const provider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'full-refund-provider', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'full-refund-provider', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'full-refund-provider', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'full-refund-provider', status: PaymentStatus.REFUNDED }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'full-refund-provider', status: PaymentStatus.CAPTURED }),
  };

  const authorized = await authorizePayment(payment.id, provider);
  const captured = await capturePayment(authorized.id, provider);
  const refunded = await refundPayment(captured.id, provider);

  assert.equal(refunded.status, PaymentStatus.REFUNDED);
  assert.equal(refunded.providerPaymentId, 'full-refund-provider');
});

test('authorization can persist PROCESSING with provider identity and reference', async () => {
  clearState();

  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '55.00',
    currency: 'USD',
    idempotencyKey: 'sale-processing-authorization',
  });

  const processingProvider = {
    ...mockProvider,
    authorize: async () => ({
      provider: 'stripe',
      providerPaymentId: 'pi_processing_123',
      status: PaymentStatus.PROCESSING,
      metadata: {
        stripePaymentIntentStatus: 'requires_action',
      },
    }),
  };

  const result = await authorizePayment(
    payment.id,
    processingProvider
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
    'pi_processing_123'
  );

  assert.equal(
    result.metadata.stripePaymentIntentStatus,
    'requires_action'
  );
});

test('generic arbitrary status updates are not exposed and provider failure leaves state unchanged', async () => {
  clearState();
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '40.00',
    currency: 'USD',
    idempotencyKey: 'sale-provider-failure',
  });

  const failingProvider = {
    authorize: async () => { throw new Error('provider unavailable'); },
    capture: async () => { throw new Error('provider unavailable'); },
    cancel: async () => { throw new Error('provider unavailable'); },
    refund: async () => { throw new Error('provider unavailable'); },
    getStatus: async () => { throw new Error('provider unavailable'); },
  };

  await assert.rejects(
    authorizePayment(payment.id, failingProvider),
    (error) => error && error.message.includes('provider unavailable')
  );

  const refreshed = await paymentRepositoryModule.exports.findPaymentById(payment.id);
  assert.equal(refreshed.status, PaymentStatus.PENDING);
});

test('repeated provider operations do not call the provider again once the terminal state already exists', async () => {
  clearState();

  const authProvider = {
    authorizeCalls: 0,
    captureCalls: 0,
    cancelCalls: 0,
    refundCalls: 0,
    authorize: async (input) => {
      authProvider.authorizeCalls += 1;
      return { provider: 'mock-provider', providerPaymentId: `auth-${input.orderId}`, status: PaymentStatus.AUTHORIZED, metadata: { strategy: 'iterative-authorize' } };
    },
    capture: async (input) => {
      authProvider.captureCalls += 1;
      return { provider: 'mock-provider', providerPaymentId: input.providerPaymentId ?? `capture-${input.orderId}`, status: PaymentStatus.CAPTURED, metadata: { strategy: 'iterative-capture' } };
    },
    cancel: async (input) => {
      authProvider.cancelCalls += 1;
      return { provider: 'mock-provider', providerPaymentId: input.providerPaymentId ?? `cancel-${input.orderId}`, status: PaymentStatus.CANCELLED, metadata: { strategy: 'iterative-cancel' } };
    },
    refund: async (input) => {
      authProvider.refundCalls += 1;
      return { provider: 'mock-provider', providerPaymentId: input.providerPaymentId ?? `refund-${input.orderId}`, status: PaymentStatus.REFUNDED, metadata: { strategy: 'iterative-refund' } };
    },
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'status-ref', status: PaymentStatus.CAPTURED }),
  };

  orders.set('sale-authorize-idempotency', { id: 'sale-authorize-idempotency', transactionType: ListingType.SALE });
  const authorizePaymentRecord = await createPaymentRecord({
    orderId: 'sale-authorize-idempotency',
    purpose: PaymentPurpose.SALE,
    amount: '55.00',
    currency: 'USD',
    idempotencyKey: 'sale-authorize-idempotency',
  });
  const authorized = await authorizePayment(authorizePaymentRecord.id, authProvider);
  assert.equal(authProvider.authorizeCalls, 1);
  assert.equal(authorized.status, PaymentStatus.AUTHORIZED);
  const repeatAuthorized = await authorizePayment(authorizePaymentRecord.id, authProvider);
  assert.equal(authProvider.authorizeCalls, 1);
  assert.equal(repeatAuthorized.status, PaymentStatus.AUTHORIZED);

  orders.set('sale-capture-idempotency', { id: 'sale-capture-idempotency', transactionType: ListingType.SALE });
  const capturePaymentRecord = await createPaymentRecord({
    orderId: 'sale-capture-idempotency',
    purpose: PaymentPurpose.SALE,
    amount: '65.00',
    currency: 'USD',
    idempotencyKey: 'sale-capture-idempotency',
  });
  const captureAuthorized = await authorizePayment(capturePaymentRecord.id, authProvider);
  const captured = await capturePayment(captureAuthorized.id, authProvider);
  assert.equal(authProvider.captureCalls, 1);
  assert.equal(captured.status, PaymentStatus.CAPTURED);
  const repeatCaptured = await capturePayment(captureAuthorized.id, authProvider);
  assert.equal(authProvider.captureCalls, 1);
  assert.equal(repeatCaptured.status, PaymentStatus.CAPTURED);

  orders.set('sale-cancel-idempotency', { id: 'sale-cancel-idempotency', transactionType: ListingType.SALE });
  const cancelPaymentRecord = await createPaymentRecord({
    orderId: 'sale-cancel-idempotency',
    purpose: PaymentPurpose.SALE,
    amount: '75.00',
    currency: 'USD',
    idempotencyKey: 'sale-cancel-idempotency',
  });
  const cancelAuthorized = await authorizePayment(cancelPaymentRecord.id, authProvider);
  const cancelled = await cancelPayment(cancelAuthorized.id, authProvider);
  assert.equal(authProvider.cancelCalls, 1);
  assert.equal(cancelled.status, PaymentStatus.CANCELLED);
  const repeatCancelled = await cancelPayment(cancelAuthorized.id, authProvider);
  assert.equal(authProvider.cancelCalls, 1);
  assert.equal(repeatCancelled.status, PaymentStatus.CANCELLED);

  orders.set('sale-refund-idempotency', { id: 'sale-refund-idempotency', transactionType: ListingType.SALE });
  const refundPaymentRecord = await createPaymentRecord({
    orderId: 'sale-refund-idempotency',
    purpose: PaymentPurpose.SALE,
    amount: '85.00',
    currency: 'USD',
    idempotencyKey: 'sale-refund-idempotency',
  });
  const refundAuthorized = await authorizePayment(refundPaymentRecord.id, authProvider);
  const refundCaptured = await capturePayment(refundAuthorized.id, authProvider);
  const refunded = await refundPayment(refundCaptured.id, authProvider);
  assert.equal(authProvider.refundCalls, 1);
  assert.equal(refunded.status, PaymentStatus.REFUNDED);
  const repeatRefunded = await refundPayment(refundCaptured.id, authProvider);
  assert.equal(authProvider.refundCalls, 1);
  assert.equal(repeatRefunded.status, PaymentStatus.REFUNDED);
});

test('rental deposit hold/release/capture idempotency does not repeat provider operations', async () => {
  clearState();

  const order1 = {
    id: 'rent-hold-idempotency',
    buyerId: 'buyer-1',
    transactionType: ListingType.RENT,
    currency: 'USD',
    rentalDepositAmount: new Prisma.Decimal('30.00'),
  };
  orders.set('rent-hold-idempotency', order1);
  const holdPayment = await createPaymentRecord({
    orderId: 'rent-hold-idempotency',
    purpose: PaymentPurpose.RENT_DEPOSIT,
    amount: '30.00',
    currency: 'USD',
    idempotencyKey: 'deposit-hold-idempotency',
  });

  let authorizeCalls = 0;
  let cancelCalls = 0;
  let captureCalls = 0;
  const provider = {
    authorize: async (input) => {
      authorizeCalls += 1;
      return { provider: 'mock-provider', providerPaymentId: `deposit-auth-${input.orderId}`, status: PaymentStatus.AUTHORIZED, metadata: { strategy: 'deposit-authorize' } };
    },
    capture: async (input) => {
      captureCalls += 1;
      return { provider: 'mock-provider', providerPaymentId: input.providerPaymentId ?? `deposit-capture-${input.orderId}`, status: PaymentStatus.CAPTURED, metadata: { strategy: 'deposit-capture' } };
    },
    cancel: async (input) => {
      cancelCalls += 1;
      return { provider: 'mock-provider', providerPaymentId: input.providerPaymentId ?? `deposit-cancel-${input.orderId}`, status: PaymentStatus.CANCELLED, metadata: { strategy: 'deposit-cancel' } };
    },
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'unused-refund', status: PaymentStatus.REFUNDED, metadata: { strategy: 'unused-refund' } }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'unused-sync', status: PaymentStatus.CAPTURED }),
  };

  const holdAuthorized = await authorizeRentalDeposit('rent-hold-idempotency', 'buyer-1', provider);
  assert.equal(authorizeCalls, 1);
  assert.equal(holdAuthorized.status, PaymentStatus.AUTHORIZED);
  const alreadyAuthorized = await authorizeRentalDeposit('rent-hold-idempotency', 'buyer-1', provider);
  assert.equal(authorizeCalls, 1);
  assert.equal(alreadyAuthorized.status, PaymentStatus.AUTHORIZED);

  const order2 = {
    id: 'rent-release-idempotency',
    buyerId: 'buyer-1',
    transactionType: ListingType.RENT,
    currency: 'USD',
    rentalDepositAmount: new Prisma.Decimal('35.00'),
  };
  orders.set('rent-release-idempotency', order2);
  const releasePayment = await createPaymentRecord({
    orderId: 'rent-release-idempotency',
    purpose: PaymentPurpose.RENT_DEPOSIT,
    amount: '35.00',
    currency: 'USD',
    idempotencyKey: 'deposit-release-idempotency',
  });
  await paymentRepositoryModule.exports.updatePaymentStatus(releasePayment.id, PaymentStatus.AUTHORIZED, {
    provider: 'mock-provider',
    providerPaymentId: `deposit-auth-rent-release-idempotency`,
  });
  const released = await releaseRentalDeposit('rent-release-idempotency', provider);
  assert.equal(cancelCalls, 1);
  assert.equal(released.status, PaymentStatus.CANCELLED);
  const alreadyReleased = await releaseRentalDeposit('rent-release-idempotency', provider);
  assert.equal(cancelCalls, 1);
  assert.equal(alreadyReleased.status, PaymentStatus.CANCELLED);

  const order3 = { id: 'rent-capture-idempotency', buyerId: 'buyer-1', transactionType: ListingType.RENT };
  orders.set('rent-capture-idempotency', order3);
  const capturePaymentRecord = await createPaymentRecord({
    orderId: 'rent-capture-idempotency',
    purpose: PaymentPurpose.RENT_DEPOSIT,
    amount: '40.00',
    currency: 'USD',
    idempotencyKey: 'deposit-capture-idempotency',
  });
  await paymentRepositoryModule.exports.updatePaymentStatus(capturePaymentRecord.id, PaymentStatus.AUTHORIZED, {
    provider: 'mock-provider',
    providerPaymentId: `deposit-auth-rent-capture-idempotency`,
  });
  const captured = await captureRentalDeposit('rent-capture-idempotency', provider);
  assert.equal(captureCalls, 1);
  assert.equal(captured.status, PaymentStatus.CAPTURED);
  const alreadyCaptured = await captureRentalDeposit('rent-capture-idempotency', provider);
  assert.equal(captureCalls, 1);
  assert.equal(alreadyCaptured.status, PaymentStatus.CAPTURED);
});

test('duplicate concurrent payment operations share the same provider call', async () => {
  clearState();

  const makeProvider = (operation, onCall) => ({
    authorize: async (input) => {
      if (operation === 'authorize') {
        onCall();
        return { provider: 'mock-provider', providerPaymentId: `auth-${input.orderId}`, status: PaymentStatus.AUTHORIZED, metadata: { strategy: 'concurrent-authorize' } };
      }
      return { provider: 'mock-provider', providerPaymentId: `auth-${input.orderId}`, status: PaymentStatus.AUTHORIZED, metadata: { strategy: 'standby-authorize' } };
    },
    capture: async (input) => {
      if (operation === 'capture') {
        onCall();
        return { provider: 'mock-provider', providerPaymentId: input.providerPaymentId ?? `capture-${input.orderId}`, status: PaymentStatus.CAPTURED, metadata: { strategy: 'concurrent-capture' } };
      }
      return { provider: 'mock-provider', providerPaymentId: input.providerPaymentId ?? `capture-${input.orderId}`, status: PaymentStatus.CAPTURED, metadata: { strategy: 'standby-capture' } };
    },
    cancel: async (input) => {
      if (operation === 'cancel') {
        onCall();
        return { provider: 'mock-provider', providerPaymentId: input.providerPaymentId ?? `cancel-${input.orderId}`, status: PaymentStatus.CANCELLED, metadata: { strategy: 'concurrent-cancel' } };
      }
      return { provider: 'mock-provider', providerPaymentId: input.providerPaymentId ?? `cancel-${input.orderId}`, status: PaymentStatus.CANCELLED, metadata: { strategy: 'standby-cancel' } };
    },
    refund: async (input) => {
      if (operation === 'refund') {
        onCall();
        return { provider: 'mock-provider', providerPaymentId: input.providerPaymentId ?? `refund-${input.orderId}`, status: PaymentStatus.REFUNDED, metadata: { strategy: 'concurrent-refund' } };
      }
      return { provider: 'mock-provider', providerPaymentId: input.providerPaymentId ?? `refund-${input.orderId}`, status: PaymentStatus.REFUNDED, metadata: { strategy: 'standby-refund' } };
    },
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'status-ref', status: PaymentStatus.CAPTURED }),
  });

  const authOrder = { id: 'concurrent-authorize', buyerId: 'buyer-5', transactionType: ListingType.SALE, status: 'PENDING' };
  orders.set('concurrent-authorize', authOrder);
  const authPayment = await createPaymentRecord({
    orderId: 'concurrent-authorize',
    purpose: PaymentPurpose.SALE,
    amount: '10.00',
    currency: 'USD',
    idempotencyKey: 'concurrent-authorize',
  });
  let authorizeCalls = 0;
  const authorizeProvider = makeProvider('authorize', () => { authorizeCalls += 1; });
  const [authorizeA, authorizeB] = await Promise.all([
    authorizePayment(authPayment.id, authorizeProvider),
    authorizePayment(authPayment.id, authorizeProvider),
  ]);
  assert.equal(authorizeCalls, 1);
  assert.equal(authorizeA.status, PaymentStatus.AUTHORIZED);
  assert.equal(authorizeB.status, PaymentStatus.AUTHORIZED);

  const captureOrder = { id: 'concurrent-capture', buyerId: 'buyer-6', transactionType: ListingType.SALE, status: 'PENDING' };
  orders.set('concurrent-capture', captureOrder);
  const capturePaymentRecord = await createPaymentRecord({
    orderId: 'concurrent-capture',
    purpose: PaymentPurpose.SALE,
    amount: '20.00',
    currency: 'USD',
    idempotencyKey: 'concurrent-capture',
  });
  await paymentRepositoryModule.exports.updatePaymentStatus(capturePaymentRecord.id, PaymentStatus.AUTHORIZED, {
    provider: 'mock-provider',
    providerPaymentId: 'payment-concurrent-capture',
  });
  let captureCalls = 0;
  const captureProvider = makeProvider('capture', () => { captureCalls += 1; });
  const [captureA, captureB] = await Promise.all([
    capturePayment(capturePaymentRecord.id, captureProvider),
    capturePayment(capturePaymentRecord.id, captureProvider),
  ]);
  assert.equal(captureCalls, 1);
  assert.equal(captureA.status, PaymentStatus.CAPTURED);
  assert.equal(captureB.status, PaymentStatus.CAPTURED);

  const cancelOrder = { id: 'concurrent-cancel', buyerId: 'buyer-7', transactionType: ListingType.SALE, status: 'PENDING' };
  orders.set('concurrent-cancel', cancelOrder);
  const cancelPaymentRecord = await createPaymentRecord({
    orderId: 'concurrent-cancel',
    purpose: PaymentPurpose.SALE,
    amount: '30.00',
    currency: 'USD',
    idempotencyKey: 'concurrent-cancel',
  });
  await paymentRepositoryModule.exports.updatePaymentStatus(cancelPaymentRecord.id, PaymentStatus.AUTHORIZED, {
    provider: 'mock-provider',
    providerPaymentId: 'payment-concurrent-cancel',
  });
  let cancelCalls = 0;
  const cancelProvider = makeProvider('cancel', () => { cancelCalls += 1; });
  const [cancelA, cancelB] = await Promise.all([
    cancelPayment(cancelPaymentRecord.id, cancelProvider),
    cancelPayment(cancelPaymentRecord.id, cancelProvider),
  ]);
  assert.equal(cancelCalls, 1);
  assert.equal(cancelA.status, PaymentStatus.CANCELLED);
  assert.equal(cancelB.status, PaymentStatus.CANCELLED);

  const refundOrder = { id: 'concurrent-refund', buyerId: 'buyer-8', transactionType: ListingType.SALE, status: 'PENDING' };
  orders.set('concurrent-refund', refundOrder);
  const refundPaymentRecord = await createPaymentRecord({
    orderId: 'concurrent-refund',
    purpose: PaymentPurpose.SALE,
    amount: '40.00',
    currency: 'USD',
    idempotencyKey: 'concurrent-refund',
  });
  await paymentRepositoryModule.exports.updatePaymentStatus(refundPaymentRecord.id, PaymentStatus.CAPTURED, {
    provider: 'mock-provider',
    providerPaymentId: 'payment-concurrent-refund',
  });
  let refundCalls = 0;
  const refundProvider = makeProvider('refund', () => { refundCalls += 1; });
  const [refundA, refundB] = await Promise.all([
    refundPayment(refundPaymentRecord.id, refundProvider),
    refundPayment(refundPaymentRecord.id, refundProvider),
  ]);
  assert.equal(refundCalls, 1);
  assert.equal(refundA.status, PaymentStatus.REFUNDED);
  assert.equal(refundB.status, PaymentStatus.REFUNDED);
});

test('buyer reconciliation syncs an AUTHORIZED sale payment to CAPTURED', async () => {
  clearState();
  const payment = await makePaymentWithProvider('sale-order', PaymentPurpose.SALE, '33.00', 'USD', 'sale-order-sync', 'mock-provider', 'sale-sync-ref');
  await paymentRepositoryModule.exports.updatePaymentStatus(payment.id, PaymentStatus.AUTHORIZED);

  const provider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'sale-sync-ref', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'sale-sync-ref', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'sale-sync-ref', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'sale-sync-ref', status: PaymentStatus.REFUNDED }),
    getStatus: async (providerPaymentId) => {
      assert.equal(providerPaymentId, 'sale-sync-ref');
      return { provider: 'mock-provider', providerPaymentId, status: PaymentStatus.CAPTURED };
    },
  };

  const synced = await syncOrderPaymentStatus('sale-order', 'buyer-1', provider);
  assert.equal(synced.status, PaymentStatus.CAPTURED);
});

test('wrong buyer cannot reconcile and provider getStatus is not called', async () => {
  clearState();
  await makePaymentWithProvider('sale-order', PaymentPurpose.SALE, '33.00', 'USD', 'sale-order-wrong-buyer', 'mock-provider', 'sale-wrong-ref');

  let providerCalled = false;
  const provider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'sale-wrong-ref', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'sale-wrong-ref', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'sale-wrong-ref', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'sale-wrong-ref', status: PaymentStatus.REFUNDED }),
    getStatus: async () => {
      providerCalled = true;
      return { provider: 'mock-provider', providerPaymentId: 'sale-wrong-ref', status: PaymentStatus.CAPTURED };
    },
  };

  await assert.rejects(
    syncOrderPaymentStatus('sale-order', 'buyer-other', provider),
    (error) => {
      assert.equal(providerCalled, false);
      return error && error.statusCode === 403;
    }
  );
});

test('order reconciliation returns 404 when the main payment is missing', async () => {
  clearState();

  await assert.rejects(
    syncOrderPaymentStatus('sale-order', 'buyer-1', mockProvider),
    (error) => error && error.statusCode === 404
  );
});

test('order reconciliation uses SALE and RENT main payment purposes, not RENT_DEPOSIT', async () => {
  clearState();
  const salePayment = await makePaymentWithProvider('sale-order', PaymentPurpose.SALE, '20.00', 'USD', 'sale-purpose-sync', 'mock-provider', 'sale-main-ref');
  await paymentRepositoryModule.exports.updatePaymentStatus(salePayment.id, PaymentStatus.AUTHORIZED);

  const rentPayment = await makePaymentWithProvider('rent-order', PaymentPurpose.RENT, '100.00', 'USD', 'rent-purpose-sync', 'mock-provider', 'rent-main-ref');
  await paymentRepositoryModule.exports.updatePaymentStatus(rentPayment.id, PaymentStatus.AUTHORIZED);
  await makePaymentWithProvider('rent-order', PaymentPurpose.RENT_DEPOSIT, '25.00', 'USD', 'rent-deposit-purpose-sync', 'mock-provider', 'rent-deposit-ref');

  const syncCalls = [];
  const provider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'unused', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'unused', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'unused', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'unused', status: PaymentStatus.REFUNDED }),
    getStatus: async (providerPaymentId) => {
      syncCalls.push(providerPaymentId);
      return { provider: 'mock-provider', providerPaymentId, status: PaymentStatus.CAPTURED };
    },
  };

  await syncOrderPaymentStatus('sale-order', 'buyer-1', provider);
  await syncOrderPaymentStatus('rent-order', 'buyer-1', provider);

  assert.deepEqual(syncCalls, ['sale-main-ref', 'rent-main-ref']);
});
