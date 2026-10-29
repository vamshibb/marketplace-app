require('ts-node/register/transpile-only');

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const {
  OrderStatus,
  RentalDisputeStatus,
  RentalDisputeResolution,
  Prisma,
} = require('../src/generated/prisma');

const orderRepositoryId = require.resolve(
  '../src/repositories/order.repository.ts'
);

const rentalDisputeRepositoryId = require.resolve(
  '../src/repositories/rentalDispute.repository.ts'
);

const orders = new Map();

let existingDispute = null;
let createdDispute = null;
let createError = null;
let disputeById = null;

let claimCalls = 0;
let finalizeCalls = 0;
let reopenCalls = 0;
let cancelCalls = 0;

let releaseCalls = 0;
let captureCalls = 0;
let depositError = null;

let forceClaimConflict = false;
let forceCancelConflict = false;
let duringDeposit = null;

const orderRepositoryModule = new Module(orderRepositoryId);
orderRepositoryModule.filename = orderRepositoryId;
orderRepositoryModule.loaded = true;
orderRepositoryModule.exports = {
  findOrderById: async (orderId) => orders.get(orderId) ?? null,
};

require.cache[orderRepositoryId] = orderRepositoryModule;

const rentalDisputeRepositoryModule = new Module(
  rentalDisputeRepositoryId
);

rentalDisputeRepositoryModule.filename =
  rentalDisputeRepositoryId;

rentalDisputeRepositoryModule.loaded = true;

rentalDisputeRepositoryModule.exports = {
  findRentalDisputeByOrderId: async (orderId) => {
    if (
      existingDispute &&
      existingDispute.orderId === orderId
    ) {
      return existingDispute;
    }

    if (
      disputeById &&
      disputeById.orderId === orderId
    ) {
      return disputeById;
    }

    return null;
  },

  openRentalDisputeAtomically: async ({
    orderId,
    openedById,
    reason,
    details,
  }) => {
    if (createError) {
      if (
        createError instanceof
          Prisma.PrismaClientKnownRequestError &&
        createError.code === "P2002"
      ) {
        return {
          kind: "existing",
        };
      }

      throw createError;
    }

    const order = orders.get(orderId);

    if (!order) {
      return {
        kind: "not-found",
      };
    }

    if (order.transactionType !== "RENT") {
      return {
        kind: "not-rental",
      };
    }

    if (order.status !== OrderStatus.RETURN_PENDING) {
      return {
        kind: "wrong-status",
      };
    }

    if (
      order.buyerId !== openedById &&
      order.sellerId !== openedById
    ) {
      return {
        kind: "forbidden",
      };
    }

    if (existingDispute) {
      return {
        kind: "existing",
        dispute: existingDispute,
      };
    }

    createdDispute = {
      id: "dispute-1",
      orderId,
      openedById,
      reason,
      details,
      status: RentalDisputeStatus.OPEN,
      resolution: null,
      resolvedAt: null,
    };

    existingDispute = createdDispute;
    disputeById = createdDispute;

    return {
      kind: "opened",
      dispute: createdDispute,
    };
  },

  findRentalDisputeById: async () =>
    disputeById,

  claimRentalDisputeForResolution: async (
    id
  ) => {
    claimCalls += 1;

    if (forceClaimConflict) {
      return null;
    }

    if (
      !disputeById ||
      disputeById.id !== id ||
      disputeById.status !== RentalDisputeStatus.OPEN
    ) {
      return null;
    }

    disputeById = {
      ...disputeById,
      status: RentalDisputeStatus.RESOLVING,
    };

    existingDispute = disputeById;

    return disputeById;
  },

  finalizeRentalDisputeResolution: async (
    id,
    resolution,
    resolvedAt
  ) => {
    finalizeCalls += 1;

    if (
      !disputeById ||
      disputeById.id !== id ||
      disputeById.status !==
        RentalDisputeStatus.RESOLVING
    ) {
      return null;
    }

    disputeById = {
      ...disputeById,
      status: RentalDisputeStatus.RESOLVED,
      resolution,
      resolvedAt,
    };

    existingDispute = disputeById;

    return disputeById;
  },

  reopenRentalDisputeAfterResolutionFailure:
    async (id) => {
      reopenCalls += 1;

      if (
        !disputeById ||
        disputeById.id !== id ||
        disputeById.status !==
          RentalDisputeStatus.RESOLVING
      ) {
        return null;
      }

      disputeById = {
        ...disputeById,
        status: RentalDisputeStatus.OPEN,
      };

      existingDispute = disputeById;

      return disputeById;
    },

  cancelRentalDispute: async (
    id,
    openedById
  ) => {
    cancelCalls += 1;

    if (forceCancelConflict) {
      return null;
    }

    if (
      !disputeById ||
      disputeById.id !== id ||
      disputeById.openedById !== openedById ||
      disputeById.status !== RentalDisputeStatus.OPEN
    ) {
      return null;
    }

    disputeById = {
      ...disputeById,
      status: RentalDisputeStatus.CANCELLED,
    };

    existingDispute = disputeById;

    return disputeById;
  },
};


require.cache[rentalDisputeRepositoryId] =
  rentalDisputeRepositoryModule;

  const paymentServiceId = require.resolve(
  '../src/services/payment.service.ts'
);

const paymentServiceModule = new Module(paymentServiceId);
paymentServiceModule.filename = paymentServiceId;
paymentServiceModule.loaded = true;

paymentServiceModule.exports = {
  releaseRentalDeposit: async () => {
    releaseCalls += 1;
    if (duringDeposit) {
      const callback = duringDeposit;
      duringDeposit = null;
      await callback();
    }
    if (depositError) {
      throw depositError;
    }

    return {
      id: 'deposit-1',
      status: 'CANCELLED',
    };
  },

  captureRentalDeposit: async () => {
    captureCalls += 1;
    if (duringDeposit) {
      const callback = duringDeposit;
      duringDeposit = null;
      await callback();
    }

    if (depositError) {
      throw depositError;
    }

    return {
      id: 'deposit-1',
      status: 'CAPTURED',
    };
  },
};

require.cache[paymentServiceId] = paymentServiceModule;
const {
  openRentalDispute,
  resolveRentalDispute,
   cancelRentalDispute,
} = require('../src/services/rentalDispute.service.ts');

beforeEach(() => {
  orders.clear();

  existingDispute = null;
  createdDispute = null;
  createError = null;
  disputeById = null;

  claimCalls = 0;
  finalizeCalls = 0;
  reopenCalls = 0;
  cancelCalls = 0;

  releaseCalls = 0;
  captureCalls = 0;
  depositError = null;

  forceClaimConflict = false;
  forceCancelConflict = false;
  duringDeposit = null;
});

const createRentalOrder = ({
  id = 'rent-order',
  status = OrderStatus.RETURN_PENDING,
  buyerId = 'buyer-1',
  sellerId = 'seller-1',
} = {}) => ({
  id,
  transactionType: 'RENT',
  status,
  buyerId,
  sellerId,
});

test('opening a dispute for a missing order returns 404', async () => {
  await assert.rejects(
    openRentalDispute(
      'missing-order',
      'buyer-1',
      'Item was damaged'
    ),
    (error) => error && error.statusCode === 404
  );
});

test('SALE orders cannot have rental disputes', async () => {
  orders.set('sale-order', {
    id: 'sale-order',
    transactionType: 'SALE',
    status: OrderStatus.RETURN_PENDING,
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
  });

  await assert.rejects(
    openRentalDispute(
      'sale-order',
      'buyer-1',
      'Not applicable'
    ),
    (error) => error && error.statusCode === 409
  );
});

test('rental dispute can only be opened while RETURN_PENDING', async () => {
  orders.set(
    'active-rental',
    createRentalOrder({
      id: 'active-rental',
      status: OrderStatus.ACTIVE,
    })
  );

  await assert.rejects(
    openRentalDispute(
      'active-rental',
      'buyer-1',
      'Item problem'
    ),
    (error) => error && error.statusCode === 409
  );
});

test('unrelated users cannot open a rental dispute', async () => {
  orders.set(
    'rent-order',
    createRentalOrder()
  );

  await assert.rejects(
    openRentalDispute(
      'rent-order',
      'other-user',
      'Item problem'
    ),
    (error) => error && error.statusCode === 403
  );
});

test('blank dispute reason is rejected', async () => {
  orders.set(
    'rent-order',
    createRentalOrder()
  );

  await assert.rejects(
    openRentalDispute(
      'rent-order',
      'buyer-1',
      '   '
    ),
    (error) => error && error.statusCode === 400
  );
});

test('existing dispute prevents another dispute for the same order', async () => {
  orders.set(
    'rent-order',
    createRentalOrder()
  );

  existingDispute = {
    id: 'existing-dispute',
    orderId: 'rent-order',
    openedById: 'buyer-1',
    reason: 'Existing dispute',
    details: null,
    status: RentalDisputeStatus.OPEN,
  };

  await assert.rejects(
    openRentalDispute(
      'rent-order',
      'seller-1',
      'Another dispute'
    ),
    (error) => error && error.statusCode === 409
  );
});

test('buyer can open a dispute for a return-pending rental', async () => {
  const order = createRentalOrder();
  orders.set(order.id, order);

  const dispute = await openRentalDispute(
    order.id,
    'buyer-1',
    '  Item arrived damaged  ',
    '  Damage near the handle  '
  );

  assert.equal(dispute.orderId, order.id);
  assert.equal(dispute.openedById, 'buyer-1');
  assert.equal(dispute.reason, 'Item arrived damaged');
  assert.equal(
    dispute.details,
    'Damage near the handle'
  );
  assert.equal(
    dispute.status,
    RentalDisputeStatus.OPEN
  );

  assert.equal(
    order.status,
    OrderStatus.RETURN_PENDING
  );
});

test('seller can open a dispute for a return-pending rental', async () => {
  const order = createRentalOrder();
  orders.set(order.id, order);

  const dispute = await openRentalDispute(
    order.id,
    'seller-1',
    'Returned with damage'
  );

  assert.equal(
    dispute.openedById,
    'seller-1'
  );

  assert.equal(
    dispute.status,
    RentalDisputeStatus.OPEN
  );

  assert.equal(
    order.status,
    OrderStatus.RETURN_PENDING
  );
});

test('concurrent duplicate dispute creation returns clean 409', async () => {
  const order = createRentalOrder();
  orders.set(order.id, order);

  createError =
    new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test',
        meta: {
          target: ['orderId'],
        },
      }
    );

  await assert.rejects(
    openRentalDispute(
      order.id,
      'buyer-1',
      'Concurrent dispute'
    ),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.match(
        error.message,
        /dispute already exists/i
      );
      return true;
    }
  );
});

  "RELEASE_DEPOSIT claims the dispute, releases the deposit, then resolves it",
  async () => {
    const order = createRentalOrder();
    orders.set(order.id, order);

    disputeById = {
      id: "dispute-release",
      orderId: order.id,
      openedById: "buyer-1",
      reason: "No damage",
      details: null,
      status: RentalDisputeStatus.OPEN,
      resolution: null,
      resolvedAt: null,
    };

    existingDispute = disputeById;

    const result = await resolveRentalDispute(
      disputeById.id,
      RentalDisputeResolution.RELEASE_DEPOSIT,
      {}
    );

    assert.equal(claimCalls, 1);
    assert.equal(releaseCalls, 1);
    assert.equal(captureCalls, 0);
    assert.equal(finalizeCalls, 1);
    assert.equal(reopenCalls, 0);

    assert.equal(
      result.status,
      RentalDisputeStatus.RESOLVED
    );

    assert.equal(
      result.resolution,
      RentalDisputeResolution.RELEASE_DEPOSIT
    );

    assert.ok(result.resolvedAt);

    assert.equal(
      order.status,
      OrderStatus.RETURN_PENDING
    );
  };

  test(
  "RELEASE_DEPOSIT claims the dispute, releases the deposit, then resolves it",
  async () => {
    const order = createRentalOrder();
    orders.set(order.id, order);

    disputeById = {
      id: "dispute-release",
      orderId: order.id,
      openedById: "buyer-1",
      reason: "No damage",
      details: null,
      status: RentalDisputeStatus.OPEN,
      resolution: null,
      resolvedAt: null,
    };

    existingDispute = disputeById;

    const result = await resolveRentalDispute(
      disputeById.id,
      RentalDisputeResolution.RELEASE_DEPOSIT,
      {}
    );

    assert.equal(claimCalls, 1);
    assert.equal(releaseCalls, 1);
    assert.equal(captureCalls, 0);
    assert.equal(finalizeCalls, 1);
    assert.equal(reopenCalls, 0);

    assert.equal(
      result.status,
      RentalDisputeStatus.RESOLVED
    );

    assert.equal(
      result.resolution,
      RentalDisputeResolution.RELEASE_DEPOSIT
    );

    assert.ok(result.resolvedAt);

    assert.equal(
      order.status,
      OrderStatus.RETURN_PENDING
    );
  }
);

test(
  "CAPTURE_DEPOSIT claims the dispute, captures the deposit, then resolves it",
  async () => {
    const order = createRentalOrder();
    orders.set(order.id, order);

    disputeById = {
      id: "dispute-capture",
      orderId: order.id,
      openedById: "seller-1",
      reason: "Returned damaged",
      details: null,
      status: RentalDisputeStatus.OPEN,
      resolution: null,
      resolvedAt: null,
    };

    existingDispute = disputeById;

    const result = await resolveRentalDispute(
      disputeById.id,
      RentalDisputeResolution.CAPTURE_DEPOSIT,
      {}
    );

    assert.equal(claimCalls, 1);
    assert.equal(captureCalls, 1);
    assert.equal(releaseCalls, 0);
    assert.equal(finalizeCalls, 1);
    assert.equal(reopenCalls, 0);

    assert.equal(
      result.status,
      RentalDisputeStatus.RESOLVED
    );

    assert.equal(
      result.resolution,
      RentalDisputeResolution.CAPTURE_DEPOSIT
    );
  }
);

test(
  "deposit failure reopens the dispute for retry",
  async () => {
    const order = createRentalOrder();
    orders.set(order.id, order);

    disputeById = {
      id: "dispute-provider-failure",
      orderId: order.id,
      openedById: "seller-1",
      reason: "Damage",
      details: null,
      status: RentalDisputeStatus.OPEN,
      resolution: null,
      resolvedAt: null,
    };

    existingDispute = disputeById;

    depositError = new Error(
      "Provider failed"
    );

    await assert.rejects(
      resolveRentalDispute(
        disputeById.id,
        RentalDisputeResolution.CAPTURE_DEPOSIT,
        {}
      ),
      /Provider failed/
    );

    assert.equal(claimCalls, 1);
    assert.equal(captureCalls, 1);
    assert.equal(finalizeCalls, 0);
    assert.equal(reopenCalls, 1);

    assert.equal(
      disputeById.status,
      RentalDisputeStatus.OPEN
    );
  }
);

test(
  "resolved disputes cannot be resolved again",
  async () => {
    const order = createRentalOrder();
    orders.set(order.id, order);

    disputeById = {
      id: "dispute-already-resolved",
      orderId: order.id,
      openedById: "buyer-1",
      reason: "Resolved",
      details: null,
      status: RentalDisputeStatus.RESOLVED,
      resolution:
        RentalDisputeResolution.RELEASE_DEPOSIT,
      resolvedAt: new Date(),
    };

    existingDispute = disputeById;

    await assert.rejects(
      resolveRentalDispute(
        disputeById.id,
        RentalDisputeResolution.CAPTURE_DEPOSIT,
        {}
      ),
      (error) =>
        error &&
        error.statusCode === 409
    );

    assert.equal(claimCalls, 0);
    assert.equal(releaseCalls, 0);
    assert.equal(captureCalls, 0);
    assert.equal(finalizeCalls, 0);
  }
);

test(
  "resolve returns 409 when another operation wins before the atomic claim",
  async () => {
    const order = createRentalOrder();
    orders.set(order.id, order);

    disputeById = {
      id: "dispute-claim-race",
      orderId: order.id,
      openedById: "buyer-1",
      reason: "Damage",
      details: null,
      status: RentalDisputeStatus.OPEN,
      resolution: null,
      resolvedAt: null,
    };

    existingDispute = disputeById;
    forceClaimConflict = true;

    await assert.rejects(
      resolveRentalDispute(
        disputeById.id,
        RentalDisputeResolution.CAPTURE_DEPOSIT,
        {}
      ),
      (error) =>
        error &&
        error.statusCode === 409
    );

    assert.equal(claimCalls, 1);
    assert.equal(captureCalls, 0);
    assert.equal(releaseCalls, 0);
    assert.equal(finalizeCalls, 0);
  }
);

test(
  "cancelled dispute cannot be resolved",
  async () => {
    const order = createRentalOrder();
    orders.set(order.id, order);

    disputeById = {
      id: "dispute-cancel-first",
      orderId: order.id,
      openedById: "buyer-1",
      reason: "Changed my mind",
      details: null,
      status: RentalDisputeStatus.OPEN,
      resolution: null,
      resolvedAt: null,
    };

    existingDispute = disputeById;

    const cancelled =
      await cancelRentalDispute(
        order.id,
        "buyer-1"
      );

    assert.equal(
      cancelled.status,
      RentalDisputeStatus.CANCELLED
    );

    assert.equal(cancelCalls, 1);

    await assert.rejects(
      resolveRentalDispute(
        disputeById.id,
        RentalDisputeResolution.RELEASE_DEPOSIT,
        {}
      ),
      (error) =>
        error &&
        error.statusCode === 409
    );

    assert.equal(claimCalls, 0);
    assert.equal(releaseCalls, 0);
    assert.equal(captureCalls, 0);
  }
);

test(
  "cancel cannot win after resolution has claimed the dispute",
  async () => {
    const order = createRentalOrder();
    orders.set(order.id, order);

    disputeById = {
      id: "dispute-resolve-first",
      orderId: order.id,
      openedById: "buyer-1",
      reason: "Possible damage",
      details: null,
      status: RentalDisputeStatus.OPEN,
      resolution: null,
      resolvedAt: null,
    };

    existingDispute = disputeById;

    duringDeposit = async () => {
      await assert.rejects(
        cancelRentalDispute(
          order.id,
          "buyer-1"
        ),
        (error) =>
          error &&
          error.statusCode === 409
      );
    };

    const result = await resolveRentalDispute(
      disputeById.id,
      RentalDisputeResolution.RELEASE_DEPOSIT,
      {}
    );

    assert.equal(claimCalls, 1);
    assert.equal(releaseCalls, 1);

    assert.equal(
      result.status,
      RentalDisputeStatus.RESOLVED
    );

    assert.equal(finalizeCalls, 1);

    // Service rejects cancellation while state is RESOLVING,
    // so the repository cancel mutation is never reached.
    assert.equal(cancelCalls, 0);
  }
);

test(
  "cancel returns 409 when dispute state changes before atomic cancellation",
  async () => {
    const order = createRentalOrder();
    orders.set(order.id, order);

    disputeById = {
      id: "dispute-cancel-race",
      orderId: order.id,
      openedById: "buyer-1",
      reason: "Issue",
      details: null,
      status: RentalDisputeStatus.OPEN,
      resolution: null,
      resolvedAt: null,
    };

    existingDispute = disputeById;
    forceCancelConflict = true;

    await assert.rejects(
      cancelRentalDispute(
        order.id,
        "buyer-1"
      ),
      (error) =>
        error &&
        error.statusCode === 409
    );

    assert.equal(cancelCalls, 1);

    assert.equal(
      disputeById.status,
      RentalDisputeStatus.OPEN
    );
  }
);
