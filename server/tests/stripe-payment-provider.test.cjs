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

test('Stripe verifyWebhook maps amount_capturable_updated to AUTHORIZED with exact raw body and secret', async () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = Buffer.from('{"id":"evt_raw_1"}');
  const signature = 't=1700000000,v1=abc123';
  const secret = 'whsec_test_123';
  process.env.STRIPE_WEBHOOK_SECRET = secret;

  let receivedRaw = null;
  let receivedSignature = null;
  let receivedSecret = null;

  const fakeStripe = {
    webhooks: {
      constructEvent(raw, sig, webhookSecret) {
        receivedRaw = raw;
        receivedSignature = sig;
        receivedSecret = webhookSecret;

        return {
          id: 'evt_1',
          type: 'payment_intent.amount_capturable_updated',
          created: 1700000000,
          data: {
            object: {
              id: 'pi_authorized_1',
              status: 'requires_capture',
              livemode: false,
            },
          },
        };
      },
    },
  };

  const provider = createStripePaymentProvider(fakeStripe);

  try {
    const result = await provider.verifyWebhook(rawBody, {
      'stripe-signature': signature,
    });

    assert.equal(receivedRaw, rawBody);
    assert.equal(receivedSignature, signature);
    assert.equal(receivedSecret, secret);
    assert.equal(result.provider, 'stripe');
    assert.equal(result.providerEventId, 'evt_1');
    assert.equal(result.eventType, 'payment_intent.amount_capturable_updated');
    assert.equal(result.providerPaymentId, 'pi_authorized_1');
    assert.equal(result.paymentStatus, PaymentStatus.AUTHORIZED);
    assert.equal(result.occurredAt.toISOString(), new Date(1700000000 * 1000).toISOString());
    assert.deepEqual(result.safeMetadata, {
      stripePaymentIntentStatus: 'requires_capture',
      stripeLivemode: false,
    });
  } finally {
    if (previousSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    }
  }
});

test('Stripe verifyWebhook maps payment_failed using PaymentIntent status', async () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

  const fakeStripe = {
    webhooks: {
      constructEvent() {
        return {
          id: 'evt_failed',
          type: 'payment_intent.payment_failed',
          created: 1700000001,
          data: {
            object: {
              id: 'pi_failed_1',
              status: 'requires_payment_method',
              livemode: true,
            },
          },
        };
      },
    },
  };

  const provider = createStripePaymentProvider(fakeStripe);

  try {
    const result = await provider.verifyWebhook(Buffer.from('ok'), {
      'Stripe-Signature': 'sig_failed',
    });

    assert.equal(result.paymentStatus, PaymentStatus.PROCESSING);
    assert.equal(result.providerPaymentId, 'pi_failed_1');
  } finally {
    if (previousSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    }
  }
});

test('Stripe verifyWebhook maps succeeded to CAPTURED', async () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

  const fakeStripe = {
    webhooks: {
      constructEvent() {
        return {
          id: 'evt_succeeded',
          type: 'payment_intent.succeeded',
          created: 1700000002,
          data: {
            object: {
              id: 'pi_succeeded_1',
              status: 'succeeded',
              livemode: true,
            },
          },
        };
      },
    },
  };

  const provider = createStripePaymentProvider(fakeStripe);

  try {
    const result = await provider.verifyWebhook(Buffer.from('ok'), {
      'stripe-signature': ['sig_succeeded', 'ignored'],
    });

    assert.equal(result.paymentStatus, PaymentStatus.CAPTURED);
    assert.equal(result.providerPaymentId, 'pi_succeeded_1');
  } finally {
    if (previousSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    }
  }
});

test('Stripe verifyWebhook maps canceled to CANCELLED', async () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

  const fakeStripe = {
    webhooks: {
      constructEvent() {
        return {
          id: 'evt_canceled',
          type: 'payment_intent.canceled',
          created: 1700000003,
          data: {
            object: {
              id: 'pi_canceled_1',
              status: 'canceled',
              livemode: false,
            },
          },
        };
      },
    },
  };

  const provider = createStripePaymentProvider(fakeStripe);

  try {
    const result = await provider.verifyWebhook(Buffer.from('ok'), {
      'stripe-signature': 'sig_canceled',
    });

    assert.equal(result.paymentStatus, PaymentStatus.CANCELLED);
    assert.equal(result.providerPaymentId, 'pi_canceled_1');
  } finally {
    if (previousSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    }
  }
});

test('Stripe verifyWebhook maps processing to PROCESSING', async () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

  const fakeStripe = {
    webhooks: {
      constructEvent() {
        return {
          id: 'evt_processing',
          type: 'payment_intent.processing',
          created: 1700000004,
          data: {
            object: {
              id: 'pi_processing_1',
              status: 'processing',
              livemode: false,
            },
          },
        };
      },
    },
  };

  const provider = createStripePaymentProvider(fakeStripe);

  try {
    const result = await provider.verifyWebhook(Buffer.from('ok'), {
      'stripe-signature': 'sig_processing',
    });

    assert.equal(result.paymentStatus, PaymentStatus.PROCESSING);
    assert.equal(result.providerPaymentId, 'pi_processing_1');
  } finally {
    if (previousSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    }
  }
});

test('Stripe verifyWebhook rejects missing stripe-signature header without calling constructEvent', async () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  let called = false;

  const fakeStripe = {
    webhooks: {
      constructEvent() {
        called = true;
        return {};
      },
    },
  };

  const provider = createStripePaymentProvider(fakeStripe);

  try {
    await assert.rejects(
      () => provider.verifyWebhook(Buffer.from('ok'), {}),
      (error) => error.statusCode === 400 && /missing Stripe webhook signature/i.test(error.message)
    );

    assert.equal(called, false);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    }
  }
});

test('Stripe verifyWebhook wraps invalid Stripe signature errors as AppError 400 without exposing details', async () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

  const fakeStripe = {
    webhooks: {
      constructEvent() {
        throw new Error('Raw payload signature mismatch: secret=whsec_test payload=abc');
      },
    },
  };

  const provider = createStripePaymentProvider(fakeStripe);

  try {
    await assert.rejects(
      () => provider.verifyWebhook(Buffer.from('raw-payload'), { 'stripe-signature': 'sig_bad' }),
      (error) => {
        const matches =
          error.statusCode === 400 &&
          /Unable to verify Stripe webhook signature\./i.test(error.message) &&
          !/Raw payload signature mismatch|whsec_test|raw-payload|client_secret/i.test(error.message);

        return matches;
      }
    );
  } finally {
    if (previousSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    }
  }
});

test('Stripe verifyWebhook requires STRIPE_WEBHOOK_SECRET', async () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;

  const fakeStripe = {
    webhooks: {
      constructEvent() {
        throw new Error('should not be called');
      },
    },
  };

  const provider = createStripePaymentProvider(fakeStripe);

  try {
    await assert.rejects(
      () => provider.verifyWebhook(Buffer.from('ok'), { 'stripe-signature': 'sig' }),
      (error) => error.statusCode === 500 && /STRIPE_WEBHOOK_SECRET is required/i.test(error.message)
    );
  } finally {
    if (previousSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    }
  }
});

test('Stripe verifyWebhook rejects unsupported event types', async () => {
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

  const fakeStripe = {
    webhooks: {
      constructEvent() {
        return {
          id: 'evt_unsupported',
          type: 'charge.refunded',
          created: 1700000005,
          data: {
            object: {
              id: 'ch_unsupported',
              status: 'succeeded',
            },
          },
        };
      },
    },
  };

  const provider = createStripePaymentProvider(fakeStripe);

  try {
    await assert.rejects(
      () => provider.verifyWebhook(Buffer.from('ok'), { 'stripe-signature': 'sig_unsupported' }),
      (error) => error.statusCode === 400 && /Unsupported Stripe webhook event type: charge\.refunded/i.test(error.message)
    );
  } finally {
    if (previousSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
    }
  }
});