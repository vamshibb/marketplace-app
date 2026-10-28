require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Module } = require('node:module');
const { Prisma, PaymentStatus, PaymentPurpose, ListingType } = require('../src/generated/prisma');

const orderRepositoryId = require.resolve('../src/repositories/order.repository.ts');
const paymentRepositoryId = require.resolve('../src/repositories/payment.repository.ts');

const orders = new Map([
  ['sale-order', { id: 'sale-order', transactionType: ListingType.SALE }],
  ['rent-order', { id: 'rent-order', transactionType: ListingType.RENT }],
  ['capture-order', { id: 'capture-order', transactionType: ListingType.SALE }],
  ['cancel-order', { id: 'cancel-order', transactionType: ListingType.RENT }],
  ['refund-order', { id: 'refund-order', transactionType: ListingType.SALE }],
  ['rent-order-hold', { id: 'rent-order-hold', transactionType: ListingType.RENT }],
  ['rent-order-capture', { id: 'rent-order-capture', transactionType: ListingType.RENT }],
  ['rent-order-release', { id: 'rent-order-release', transactionType: ListingType.RENT }],
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
};
require.cache[paymentRepositoryId] = paymentRepositoryModule;

const {
  createPaymentRecord,
  authorizePayment,
  capturePayment,
  cancelPayment,
  refundPayment,
  syncPaymentStatus,
  createPaymentForOrder,
  authorizeRentalDeposit,
  releaseRentalDeposit,
  captureRentalDeposit,
  settleCancelledOrderPayment,
  getSellerPayoutReadiness,
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

  const refreshed = await createPaymentForOrder({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '40.00',
    currency: 'USD',
    idempotencyKey: 'sale-provider-failure',
  });

  assert.equal(refreshed.status, PaymentStatus.PENDING);
  assert.equal(refreshed.id, payment.id);
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
  await assert.rejects(
    authorizePayment(authorizePaymentRecord.id, authProvider),
    (error) => {
      assert.equal(authProvider.authorizeCalls, 1);
      return error && error.statusCode === 409;
    }
  );

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
  await assert.rejects(
    capturePayment(captureAuthorized.id, authProvider),
    (error) => {
      assert.equal(authProvider.captureCalls, 1);
      return error && error.statusCode === 409;
    }
  );

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
  await assert.rejects(
    cancelPayment(cancelAuthorized.id, authProvider),
    (error) => {
      assert.equal(authProvider.cancelCalls, 1);
      return error && error.statusCode === 409;
    }
  );

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
  await assert.rejects(
    refundPayment(refundCaptured.id, authProvider),
    (error) => {
      assert.equal(authProvider.refundCalls, 1);
      return error && error.statusCode === 409;
    }
  );
});

test('rental deposit hold/release/capture idempotency does not repeat provider operations', async () => {
  clearState();

  const order1 = { id: 'rent-hold-idempotency', transactionType: ListingType.RENT };
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

  const holdAuthorized = await authorizeRentalDeposit('rent-hold-idempotency', provider);
  assert.equal(authorizeCalls, 1);
  assert.equal(holdAuthorized.status, PaymentStatus.AUTHORIZED);
  const alreadyAuthorized = await authorizeRentalDeposit('rent-hold-idempotency', provider);
  assert.equal(authorizeCalls, 1);
  assert.equal(alreadyAuthorized.status, PaymentStatus.AUTHORIZED);

  const order2 = { id: 'rent-release-idempotency', transactionType: ListingType.RENT };
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

  const order3 = { id: 'rent-capture-idempotency', transactionType: ListingType.RENT };
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

test('provider-confirmed operations only transition to allowed states', async () => {
  clearState();
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '70.00',
    currency: 'USD',
    idempotencyKey: 'sale-provider-confirmed',
  });

  const authorized = await authorizePayment(payment.id, mockProvider);
  assert.equal(authorized.status, PaymentStatus.AUTHORIZED);

  const captured = await capturePayment(authorized.id, mockProvider);
  assert.equal(captured.status, PaymentStatus.CAPTURED);

  const refundResult = await refundPayment(captured.id, mockProvider);
  assert.equal(refundResult.status, PaymentStatus.REFUNDED);
});

test('illegal transition is rejected before provider is called', async () => {
  clearState();
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '9.99',
    currency: 'USD',
    idempotencyKey: 'sale-illegal-transition',
  });

  let refundCalled = false;
  const provider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'auth-1', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'capture-1', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'cancel-1', status: PaymentStatus.CANCELLED }),
    refund: async () => {
      refundCalled = true;
      return { provider: 'mock-provider', providerPaymentId: 'refund-1', status: PaymentStatus.REFUNDED };
    },
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'sync-1', status: PaymentStatus.CAPTURED }),
  };

  await assert.rejects(
    refundPayment(payment.id, provider),
    (error) => {
      assert.equal(refundCalled, false);
      return error && error.statusCode === 409;
    }
  );
});

test('persisted orderId, purpose, amount and currency cannot be overridden through service options', async () => {
  clearState();
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '12.50',
    currency: 'USD',
    idempotencyKey: 'sale-persisted-funds',
  });

  const provider = {
    authorize: async (input) => {
      assert.equal(input.orderId, payment.orderId);
      assert.equal(input.purpose, payment.purpose);
      assert.equal(input.amount.toString(), payment.amount.toString());
      assert.equal(input.currency, payment.currency);
      return { provider: 'mock-provider', providerPaymentId: 'provider-ref-override-check', status: PaymentStatus.AUTHORIZED };
    },
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'capture-1', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'cancel-1', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'refund-1', status: PaymentStatus.REFUNDED }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'sync-1', status: PaymentStatus.CAPTURED }),
  };

  const authorized = await authorizePayment(payment.id, provider, { metadata: { source: 'service-option' } });
  assert.equal(authorized.orderId, payment.orderId);
  assert.equal(authorized.purpose, PaymentPurpose.SALE);
  assert.equal(authorized.amount.toString(), payment.amount.toString());
  assert.equal(authorized.currency, 'USD');
});

test('capture/cancel/refund receive the stored providerPaymentId and reject missing provider references', async () => {
  clearState();

  const capturePaymentRecord = await createPaymentRecord({
    orderId: 'capture-order',
    purpose: PaymentPurpose.SALE,
    amount: '18.00',
    currency: 'USD',
    idempotencyKey: 'sale-provider-id-check-capture',
  });

  const captureProvider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-1', status: PaymentStatus.AUTHORIZED }),
    capture: async (input) => {
      assert.equal(input.providerPaymentId, 'provider-ref-1');
      return { provider: 'mock-provider', providerPaymentId: 'provider-ref-1', status: PaymentStatus.CAPTURED };
    },
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-1', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-1', status: PaymentStatus.REFUNDED }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-1', status: PaymentStatus.CAPTURED }),
  };

  const authorizedCapture = await authorizePayment(capturePaymentRecord.id, captureProvider);
  const captured = await capturePayment(authorizedCapture.id, captureProvider);
  assert.equal(captured.providerPaymentId, 'provider-ref-1');

  const cancelPaymentRecord = await createPaymentRecord({
    orderId: 'cancel-order',
    purpose: PaymentPurpose.RENT,
    amount: '25.50',
    currency: 'USD',
    idempotencyKey: 'rent-provider-id-check-cancel',
  });

  const cancelProvider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-2', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-2', status: PaymentStatus.CAPTURED }),
    cancel: async (input) => {
      assert.equal(input.providerPaymentId, 'provider-ref-2');
      return { provider: 'mock-provider', providerPaymentId: 'provider-ref-2', status: PaymentStatus.CANCELLED };
    },
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-2', status: PaymentStatus.REFUNDED }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-2', status: PaymentStatus.CAPTURED }),
  };

  const authorizedCancel = await authorizePayment(cancelPaymentRecord.id, cancelProvider);
  const cancelled = await cancelPayment(authorizedCancel.id, cancelProvider);
  assert.equal(cancelled.providerPaymentId, 'provider-ref-2');

  const refundPaymentRecord = await createPaymentRecord({
    orderId: 'refund-order',
    purpose: PaymentPurpose.SALE,
    amount: '30.00',
    currency: 'USD',
    idempotencyKey: 'sale-provider-id-check-refund',
  });

  const refundProvider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-3', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-3', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-3', status: PaymentStatus.CANCELLED }),
    refund: async (input) => {
      assert.equal(input.providerPaymentId, 'provider-ref-3');
      return { provider: 'mock-provider', providerPaymentId: 'provider-ref-3', status: PaymentStatus.REFUNDED };
    },
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'provider-ref-3', status: PaymentStatus.CAPTURED }),
  };

  const authorizedRefund = await authorizePayment(refundPaymentRecord.id, refundProvider);
  const capturedRefund = await capturePayment(authorizedRefund.id, refundProvider);
  const refunded = await refundPayment(capturedRefund.id, refundProvider);
  assert.equal(refunded.providerPaymentId, 'provider-ref-3');

  const paymentWithoutRef = await createPaymentRecord({
    orderId: 'rent-order',
    purpose: PaymentPurpose.RENT,
    amount: '50.00',
    currency: 'USD',
    idempotencyKey: 'rent-missing-provider-ref',
  });

  await assert.rejects(
    capturePayment(paymentWithoutRef.id, refundProvider),
    (error) => error && error.statusCode === 409
  );
});

test('inconsistent provider identity or provider reference is rejected', async () => {
  clearState();
  const payment = await makePaymentWithProvider('sale-order', PaymentPurpose.SALE, '22.00', 'USD', 'sale-inconsistent-provider', 'mock-provider', 'prov-1');

  const provider = {
    authorize: async () => ({ provider: 'different-provider', providerPaymentId: 'prov-1', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'different-provider', providerPaymentId: 'prov-1', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'different-provider', providerPaymentId: 'prov-1', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'different-provider', providerPaymentId: 'prov-1', status: PaymentStatus.REFUNDED }),
    getStatus: async () => ({ provider: 'different-provider', providerPaymentId: 'prov-1', status: PaymentStatus.CAPTURED }),
  };

  await assert.rejects(
    capturePayment(payment.id, provider),
    (error) => error && error.statusCode === 409
  );

  const providerWithDifferentRef = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-2', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-2', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-2', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-2', status: PaymentStatus.REFUNDED }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-2', status: PaymentStatus.CAPTURED }),
  };

  await assert.rejects(
    capturePayment(payment.id, providerWithDifferentRef),
    (error) => error && error.statusCode === 409
  );
});

test('same-status sync is a harmless no-op and illegal sync remains rejected', async () => {
  clearState();
  const payment = await makePaymentWithProvider('sale-order', PaymentPurpose.SALE, '15.00', 'USD', 'sale-sync-safe', 'mock-provider', 'prov-sync-safe');

  const sameStatusProvider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-sync-safe', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-sync-safe', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-sync-safe', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-sync-safe', status: PaymentStatus.REFUNDED }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-sync-safe', status: PaymentStatus.PENDING, metadata: { lastSeen: 'noop' } }),
  };

  const synced = await syncPaymentStatus(payment.id, sameStatusProvider, 'prov-sync-safe');
  assert.equal(synced.status, PaymentStatus.PENDING);

  const illegalSyncProvider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-sync-safe', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-sync-safe', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-sync-safe', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-sync-safe', status: PaymentStatus.REFUNDED }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'prov-sync-safe', status: PaymentStatus.REFUNDED }),
  };

  await assert.rejects(
    syncPaymentStatus(payment.id, illegalSyncProvider, 'prov-sync-safe'),
    (error) => error && error.statusCode === 409
  );
});

test('concurrent unique-constraint races return equivalent payment or clean 409', async () => {
  clearState();
  const original = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '30.00',
    currency: 'USD',
    idempotencyKey: 'sale-race-equivalent',
  });

  const previousCreatePayment = paymentRepositoryModule.exports.createPayment;
  const previousOrderAndPurposeSearch = paymentRepositoryModule.exports.findPaymentByOrderAndPurpose;
  const previousIdempotencySearch = paymentRepositoryModule.exports.findPaymentByIdempotencyKey;

  paymentRepositoryModule.exports.createPayment = async () => {
    throw { code: 'P2002', meta: { target: ['orderId', 'purpose'] } };
  };
  paymentRepositoryModule.exports.findPaymentByOrderAndPurpose = async () => original;
  paymentRepositoryModule.exports.findPaymentByIdempotencyKey = async () => original;

  const sameRace = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '30.00',
    currency: 'USD',
    idempotencyKey: 'sale-race-equivalent',
  });

  assert.equal(sameRace.id, original.id);

  paymentRepositoryModule.exports.createPayment = async () => {
    throw { code: 'P2002', meta: { target: ['idempotencyKey'] } };
  };
  paymentRepositoryModule.exports.findPaymentByOrderAndPurpose = async () => null;
  paymentRepositoryModule.exports.findPaymentByIdempotencyKey = async () => ({
    ...original,
    orderId: 'different-order',
    purpose: PaymentPurpose.RENT,
    amount: new Prisma.Decimal('40.00'),
    currency: 'EUR',
  });

  await assert.rejects(
    createPaymentRecord({
      orderId: 'sale-order',
      purpose: PaymentPurpose.SALE,
      amount: '40.00',
      currency: 'USD',
      idempotencyKey: 'sale-conflict-race',
    }),
    (error) => error && error.statusCode === 409
  );

  paymentRepositoryModule.exports.createPayment = previousCreatePayment;
  paymentRepositoryModule.exports.findPaymentByOrderAndPurpose = previousOrderAndPurposeSearch;
  paymentRepositoryModule.exports.findPaymentByIdempotencyKey = previousIdempotencySearch;
});

test('rental deposit lifecycle uses the existing rental deposit payment for RENT orders only', async () => {
  clearState();

  await createPaymentRecord({
    orderId: 'rent-order-hold',
    purpose: PaymentPurpose.RENT,
    amount: '120.00',
    currency: 'USD',
    idempotencyKey: 'rent-deposit-lifecycle-rent-hold',
  });

  const holdDeposit = await createPaymentRecord({
    orderId: 'rent-order-hold',
    purpose: PaymentPurpose.RENT_DEPOSIT,
    amount: '25.00',
    currency: 'USD',
    idempotencyKey: 'rent-deposit-lifecycle-deposit-hold',
  });

  const authorized = await authorizeRentalDeposit('rent-order-hold', mockProvider);
  assert.equal(authorized.id, holdDeposit.id);
  assert.equal(authorized.status, PaymentStatus.AUTHORIZED);

  const alreadyAuthorized = await authorizeRentalDeposit('rent-order-hold', mockProvider);
  assert.equal(alreadyAuthorized.id, holdDeposit.id);
  assert.equal(alreadyAuthorized.status, PaymentStatus.AUTHORIZED);

  const releasePaymentRecord = await createPaymentRecord({
    orderId: 'rent-order-release',
    purpose: PaymentPurpose.RENT,
    amount: '140.00',
    currency: 'USD',
    idempotencyKey: 'rent-deposit-lifecycle-rent-release',
  });
  const releaseDeposit = await createPaymentRecord({
    orderId: 'rent-order-release',
    purpose: PaymentPurpose.RENT_DEPOSIT,
    amount: '35.00',
    currency: 'USD',
    idempotencyKey: 'rent-deposit-lifecycle-deposit-release',
  });
  const authorizedRelease = await authorizePayment(releaseDeposit.id, mockProvider);
  const released = await releaseRentalDeposit('rent-order-release', mockProvider);
  assert.equal(released.id, authorizedRelease.id);
  assert.equal(released.status, PaymentStatus.CANCELLED);

  const alreadyReleased = await releaseRentalDeposit('rent-order-release', mockProvider);
  assert.equal(alreadyReleased.id, authorizedRelease.id);
  assert.equal(alreadyReleased.status, PaymentStatus.CANCELLED);

  const capturePaymentRecord = await createPaymentRecord({
    orderId: 'rent-order-capture',
    purpose: PaymentPurpose.RENT,
    amount: '160.00',
    currency: 'USD',
    idempotencyKey: 'rent-deposit-lifecycle-rent-capture',
  });
  const captureDeposit = await createPaymentRecord({
    orderId: 'rent-order-capture',
    purpose: PaymentPurpose.RENT_DEPOSIT,
    amount: '40.00',
    currency: 'USD',
    idempotencyKey: 'rent-deposit-lifecycle-deposit-capture',
  });
  const authorizedCapture = await authorizePayment(captureDeposit.id, mockProvider);
  const captured = await captureRentalDeposit('rent-order-capture', mockProvider);
  assert.equal(captured.id, authorizedCapture.id);
  assert.equal(captured.status, PaymentStatus.CAPTURED);

  const alreadyCaptured = await captureRentalDeposit('rent-order-capture', mockProvider);
  assert.equal(alreadyCaptured.id, authorizedCapture.id);
  assert.equal(alreadyCaptured.status, PaymentStatus.CAPTURED);

  await assert.rejects(
    releaseRentalDeposit('rent-order-capture', mockProvider),
    (error) => error && error.statusCode === 409
  );

  await assert.rejects(
    authorizeRentalDeposit('sale-order', mockProvider),
    (error) => error && error.statusCode === 409
  );

  await assert.rejects(
    authorizeRentalDeposit('missing-order', mockProvider),
    (error) => error && error.statusCode === 404
  );

  await assert.rejects(
    authorizeRentalDeposit('rent-order', mockProvider),
    (error) => error && error.statusCode === 409
  );

  assert.ok(releasePaymentRecord.id);
  assert.ok(capturePaymentRecord.id);
});

test('provider failure still leaves the previous state unchanged', async () => {
  clearState();
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '29.00',
    currency: 'USD',
    idempotencyKey: 'sale-provider-failure-guard',
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

test('M4A payment record operations do not mutate existing order state', async () => {
  clearState();
  const order = orders.get('sale-order');
  const payment = await createPaymentRecord({
    orderId: 'sale-order',
    purpose: PaymentPurpose.SALE,
    amount: '9.99',
    currency: 'USD',
    idempotencyKey: 'sale-order-state-check',
  });

  const updated = await authorizePayment(payment.id, mockProvider);
  assert.equal(order.transactionType, ListingType.SALE);
  assert.equal(updated.orderId, 'sale-order');
  assert.equal(payment.orderId, 'sale-order');
});

test('cancelled-order settlement resolves the main payment and rejects ambiguous states', async () => {
  clearState();

  const provider = {
    authorize: async () => ({ provider: 'mock-provider', providerPaymentId: 'settle-main-auth', status: PaymentStatus.AUTHORIZED }),
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'settle-main-auth', status: PaymentStatus.CAPTURED }),
    cancel: async () => ({ provider: 'mock-provider', providerPaymentId: 'settle-main-auth', status: PaymentStatus.CANCELLED }),
    refund: async () => ({ provider: 'mock-provider', providerPaymentId: 'settle-main-auth', status: PaymentStatus.REFUNDED }),
    getStatus: async () => ({ provider: 'mock-provider', providerPaymentId: 'settle-main-auth', status: PaymentStatus.CAPTURED }),
  };

  const saleOrder = { id: 'sale-settlement-order', sellerId: 'seller-1', transactionType: ListingType.SALE };
  orders.set('sale-settlement-order', saleOrder);
  const salePayment = await createPaymentRecord({
    orderId: 'sale-settlement-order',
    purpose: PaymentPurpose.SALE,
    amount: '44.00',
    currency: 'USD',
    idempotencyKey: 'sale-settlement-order-main',
  });

  const authorized = await authorizePayment(salePayment.id, provider);
  const settledCancelled = await settleCancelledOrderPayment('sale-settlement-order', provider);
  assert.equal(settledCancelled.id, authorized.id);
  assert.equal(settledCancelled.status, PaymentStatus.CANCELLED);

  const capturedOrder = { id: 'sale-settlement-captured-order', sellerId: 'seller-2', transactionType: ListingType.RENT };
  orders.set('sale-settlement-captured-order', capturedOrder);
  const rentPayment = await createPaymentRecord({
    orderId: 'sale-settlement-captured-order',
    purpose: PaymentPurpose.RENT,
    amount: '88.00',
    currency: 'USD',
    idempotencyKey: 'sale-settlement-captured-order-main',
  });
  const authorizedRent = await authorizePayment(rentPayment.id, provider);
  const capturedRent = await capturePayment(authorizedRent.id, provider);
  const settledRefunded = await settleCancelledOrderPayment('sale-settlement-captured-order', provider);
  assert.equal(settledRefunded.id, capturedRent.id);
  assert.equal(settledRefunded.status, PaymentStatus.REFUNDED);

  const cancelledOrder = { id: 'sale-settlement-cancelled-order', sellerId: 'seller-3', transactionType: ListingType.SALE };
  orders.set('sale-settlement-cancelled-order', cancelledOrder);
  const cancelledPayment = await createPaymentRecord({
    orderId: 'sale-settlement-cancelled-order',
    purpose: PaymentPurpose.SALE,
    amount: '66.00',
    currency: 'USD',
    idempotencyKey: 'sale-settlement-cancelled-order-main',
  });
  await paymentRepositoryModule.exports.updatePaymentStatus(cancelledPayment.id, PaymentStatus.CANCELLED, {
    provider: 'mock-provider',
    providerPaymentId: 'cancelled-main-ref',
  });
  const settledAlreadyCancelled = await settleCancelledOrderPayment('sale-settlement-cancelled-order', provider);
  assert.equal(settledAlreadyCancelled.id, cancelledPayment.id);
  assert.equal(settledAlreadyCancelled.status, PaymentStatus.CANCELLED);

  const refundedOrder = { id: 'sale-settlement-refunded-order', sellerId: 'seller-4', transactionType: ListingType.RENT };
  orders.set('sale-settlement-refunded-order', refundedOrder);
  const refundedPayment = await createPaymentRecord({
    orderId: 'sale-settlement-refunded-order',
    purpose: PaymentPurpose.RENT,
    amount: '99.00',
    currency: 'USD',
    idempotencyKey: 'sale-settlement-refunded-order-main',
  });
  await paymentRepositoryModule.exports.updatePaymentStatus(refundedPayment.id, PaymentStatus.REFUNDED, {
    provider: 'mock-provider',
    providerPaymentId: 'refunded-main-ref',
  });
  const settledAlreadyRefunded = await settleCancelledOrderPayment('sale-settlement-refunded-order', provider);
  assert.equal(settledAlreadyRefunded.id, refundedPayment.id);
  assert.equal(settledAlreadyRefunded.status, PaymentStatus.REFUNDED);

  const pendingOrder = { id: 'sale-settlement-pending-order', sellerId: 'seller-5', transactionType: ListingType.SALE };
  orders.set('sale-settlement-pending-order', pendingOrder);
  const pendingPayment = await createPaymentRecord({
    orderId: 'sale-settlement-pending-order',
    purpose: PaymentPurpose.SALE,
    amount: '77.00',
    currency: 'USD',
    idempotencyKey: 'sale-settlement-pending-order-main',
  });
  await assert.rejects(
    settleCancelledOrderPayment('sale-settlement-pending-order', provider),
    (error) => error && error.statusCode === 409
  );

  await assert.rejects(
    settleCancelledOrderPayment('sale-settlement-missing-order', provider),
    (error) => error && error.statusCode === 404
  );

  const missingMainOrder = { id: 'sale-settlement-no-main', sellerId: 'seller-6', transactionType: ListingType.SALE };
  orders.set('sale-settlement-no-main', missingMainOrder);
  await assert.rejects(
    settleCancelledOrderPayment('sale-settlement-no-main', provider),
    (error) => error && error.statusCode === 404
  );

  assert.ok(pendingPayment.id);
});

test('seller payout readiness reports only captured main payments as ready', async () => {
  clearState();

  const readyOrder = { id: 'payout-ready-order', sellerId: 'seller-ready', transactionType: ListingType.SALE };
  orders.set('payout-ready-order', readyOrder);
  const readyPayment = await createPaymentRecord({
    orderId: 'payout-ready-order',
    purpose: PaymentPurpose.SALE,
    amount: '52.00',
    currency: 'USD',
    idempotencyKey: 'payout-ready-order-main',
  });

  const pendingReadiness = await getSellerPayoutReadiness('payout-ready-order');
  assert.equal(pendingReadiness.ready, false);
  assert.equal(pendingReadiness.grossAmount, '52.00');
  assert.equal(pendingReadiness.currency, 'USD');

  const authorized = await authorizePayment(readyPayment.id, mockProvider);
  const afterAuthorize = await getSellerPayoutReadiness('payout-ready-order');
  assert.equal(afterAuthorize.ready, false);
  assert.equal(afterAuthorize.paymentId, authorized.id);

  const captured = await capturePayment(authorized.id, mockProvider);
  const ready = await getSellerPayoutReadiness('payout-ready-order');
  assert.deepEqual(ready, {
    orderId: 'payout-ready-order',
    sellerId: 'seller-ready',
    paymentId: captured.id,
    grossAmount: '52.00',
    currency: 'USD',
    ready: true,
  });

  const rentOrder = { id: 'payout-rent-order', sellerId: 'seller-rent', transactionType: ListingType.RENT };
  orders.set('payout-rent-order', rentOrder);
  const rentPayment = await createPaymentRecord({
    orderId: 'payout-rent-order',
    purpose: PaymentPurpose.RENT,
    amount: '79.00',
    currency: 'USD',
    idempotencyKey: 'payout-rent-order-main',
  });
  const rentReadiness = await getSellerPayoutReadiness('payout-rent-order');
  assert.equal(rentReadiness.ready, false);
  assert.equal(rentReadiness.grossAmount, '79.00');

  await assert.rejects(
    getSellerPayoutReadiness('missing-order'),
    (error) => error && error.statusCode === 404
  );

  const missingMainOrder = { id: 'payout-missing-main', sellerId: 'seller-no-main', transactionType: ListingType.SALE };
  orders.set('payout-missing-main', missingMainOrder);
  await assert.rejects(
    getSellerPayoutReadiness('payout-missing-main'),
    (error) => error && error.statusCode === 404
  );

  assert.ok(rentPayment.id);
});
