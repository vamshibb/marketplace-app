require('ts-node/register/transpile-only');

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} = require('../src/generated/prisma');

const {
  createStripePaymentProvider,
} = require('../src/services/stripePaymentProvider.ts');

const createInput = (overrides = {}) => ({
  orderId: 'order-1',
  purpose: PaymentPurpose.SALE,
  amount: new Prisma.Decimal('12.34'),
  currency: 'CAD',
  idempotencyKey: 'order-1:SALE',
  operationIdempotencyKey: 'order-1:SALE:authorize',
  providerPaymentId: null,
  metadata: null,
  ...overrides,
});

test('Stripe authorize converts CAD amount to minor units and preserves idempotency', async () => {
  let receivedParams = null;
  let receivedOptions = null;

  const fakeStripe = {
    paymentIntents: {
      async create(params, options) {
        receivedParams = params;
        receivedOptions = options;

        return {
          id: 'pi_authorize_1',
          status: 'requires_action',
          client_secret: 'pi_secret_123',
          latest_charge: null,
        };
      },
    },
    refunds: {},
  };

  const provider =
    createStripePaymentProvider(fakeStripe);

  const result = await provider.authorize(
    createInput()
  );

  assert.equal(receivedParams.amount, 1234);
  assert.equal(receivedParams.currency, 'cad');
  assert.equal(
    receivedParams.capture_method,
    'manual'
  );

  assert.equal(
    receivedParams.automatic_payment_methods.enabled,
    true
  );

  assert.equal(
    receivedParams.metadata.orderId,
    'order-1'
  );

  assert.equal(
    receivedParams.metadata.purpose,
    PaymentPurpose.SALE
  );

  assert.equal(
    receivedOptions.idempotencyKey,
    'order-1:SALE:authorize'
  );

  assert.equal(result.provider, 'stripe');
  assert.equal(
    result.providerPaymentId,
    'pi_authorize_1'
  );

  assert.equal(
    result.status,
    PaymentStatus.PROCESSING
  );

  assert.equal(
    result.clientSecret,
    'pi_secret_123'
  );
});

test('Stripe requires_capture maps to local AUTHORIZED', async () => {
  const fakeStripe = {
    paymentIntents: {
      async create() {
        return {
          id: 'pi_authorized',
          status: 'requires_capture',
          client_secret: 'secret',
          latest_charge: null,
        };
      },
    },
    refunds: {},
  };

  const provider =
    createStripePaymentProvider(fakeStripe);

  const result = await provider.authorize(
    createInput()
  );

  assert.equal(
    result.status,
    PaymentStatus.AUTHORIZED
  );

  assert.equal(
    result.providerPaymentId,
    'pi_authorized'
  );
});

test('Stripe capture uses provider payment ID and operation idempotency key', async () => {
  let capturedId = null;
  let capturedOptions = null;

  const fakeStripe = {
    paymentIntents: {
      async capture(id, params, options) {
        capturedId = id;
        capturedOptions = options;

        assert.deepEqual(params, {});

        return {
          id,
          status: 'succeeded',
          client_secret: null,
          latest_charge: null,
        };
      },
    },
    refunds: {},
  };

  const provider =
    createStripePaymentProvider(fakeStripe);

  const result = await provider.capture(
    createInput({
      providerPaymentId: 'pi_capture_1',
      operationIdempotencyKey:
        'order-1:SALE:capture',
    })
  );

  assert.equal(
    capturedId,
    'pi_capture_1'
  );

  assert.equal(
    capturedOptions.idempotencyKey,
    'order-1:SALE:capture'
  );

  assert.equal(
    result.status,
    PaymentStatus.CAPTURED
  );
});

test('Stripe cancel maps canceled PaymentIntent to local CANCELLED', async () => {
  let cancelledId = null;
  let cancelOptions = null;

  const fakeStripe = {
    paymentIntents: {
      async cancel(id, params, options) {
        cancelledId = id;
        cancelOptions = options;

        assert.deepEqual(params, {});

        return {
          id,
          status: 'canceled',
          client_secret: null,
          latest_charge: null,
        };
      },
    },
    refunds: {},
  };

  const provider =
    createStripePaymentProvider(fakeStripe);

  const result = await provider.cancel(
    createInput({
      providerPaymentId: 'pi_cancel_1',
      operationIdempotencyKey:
        'order-1:SALE:cancel',
    })
  );

  assert.equal(
    cancelledId,
    'pi_cancel_1'
  );

  assert.equal(
    cancelOptions.idempotencyKey,
    'order-1:SALE:cancel'
  );

  assert.equal(
    result.status,
    PaymentStatus.CANCELLED
  );
});

test('Stripe refund uses PaymentIntent and returns local REFUNDED', async () => {
  let refundParams = null;
  let refundOptions = null;
  let retrievedId = null;

  const fakeStripe = {
    paymentIntents: {
      async retrieve(id, params) {
        retrievedId = id;

        assert.deepEqual(params, {
          expand: ['latest_charge'],
        });

        return {
          id,
          status: 'succeeded',
          client_secret: null,
          latest_charge: {
            id: 'ch_refund_1',
            refunded: true,
            amount_refunded: 1234,
          },
        };
      },
    },

    refunds: {
      async create(params, options) {
        refundParams = params;
        refundOptions = options;

        return {
          id: 're_1',
          status: 'succeeded',
        };
      },
    },
  };

  const provider =
    createStripePaymentProvider(fakeStripe);

  const result = await provider.refund(
    createInput({
      providerPaymentId: 'pi_refund_1',
      operationIdempotencyKey:
        'order-1:SALE:refund',
    })
  );

  assert.deepEqual(refundParams, {
    payment_intent: 'pi_refund_1',
  });

  assert.equal(
    refundOptions.idempotencyKey,
    'order-1:SALE:refund'
  );

  assert.equal(
    retrievedId,
    'pi_refund_1'
  );

  assert.equal(
    result.status,
    PaymentStatus.REFUNDED
  );

  assert.equal(
    result.metadata.stripeRefundId,
    're_1'
  );

  assert.equal(
    result.metadata.stripeRefundStatus,
    'succeeded'
  );
});

test('Stripe getStatus maps fully and partially refunded charges', async () => {
  const fakeStripe = {
    paymentIntents: {
      async retrieve(id) {
        if (id === 'pi_full_refund') {
          return {
            id,
            status: 'succeeded',
            client_secret: null,
            latest_charge: {
              id: 'ch_full',
              refunded: true,
              amount_refunded: 1000,
            },
          };
        }

        return {
          id,
          status: 'succeeded',
          client_secret: null,
          latest_charge: {
            id: 'ch_partial',
            refunded: false,
            amount_refunded: 500,
          },
        };
      },
    },
    refunds: {},
  };

  const provider =
    createStripePaymentProvider(fakeStripe);

  const fullyRefunded =
    await provider.getStatus(
      'pi_full_refund'
    );

  assert.equal(
    fullyRefunded.status,
    PaymentStatus.REFUNDED
  );

  const partiallyRefunded =
    await provider.getStatus(
      'pi_partial_refund'
    );

  assert.equal(
    partiallyRefunded.status,
    PaymentStatus.PARTIALLY_REFUNDED
  );
});

test('Stripe rejects unsupported currency before making provider request', async () => {
  let createCalls = 0;

  const fakeStripe = {
    paymentIntents: {
      async create() {
        createCalls += 1;
        throw new Error(
          'Stripe should not be called'
        );
      },
    },
    refunds: {},
  };

  const provider =
    createStripePaymentProvider(fakeStripe);

  await assert.rejects(
    () =>
      provider.authorize(
        createInput({
          currency: 'USD',
        })
      ),
    (error) =>
      error.statusCode === 409 &&
      /currency USD is not supported/i.test(
        error.message
      )
  );

  assert.equal(createCalls, 0);
});

test('Stripe lifecycle operations require providerPaymentId', async () => {
  const fakeStripe = {
    paymentIntents: {
      async capture() {
        throw new Error('not used');
      },

      async cancel() {
        throw new Error('not used');
      },
    },

    refunds: {
      async create() {
        throw new Error('not used');
      },
    },
  };

  const provider =
    createStripePaymentProvider(fakeStripe);

  await assert.rejects(
    () =>
      provider.capture(
        createInput({
          providerPaymentId: null,
        })
      ),
    (error) =>
      error.statusCode === 409 &&
      /required for capture/i.test(
        error.message
      )
  );

  await assert.rejects(
    () =>
      provider.cancel(
        createInput({
          providerPaymentId: null,
        })
      ),
    (error) =>
      error.statusCode === 409 &&
      /required for cancellation/i.test(
        error.message
      )
  );

  await assert.rejects(
    () =>
      provider.refund(
        createInput({
          providerPaymentId: null,
        })
      ),
    (error) =>
      error.statusCode === 409 &&
      /required for refund/i.test(
        error.message
      )
  );
});