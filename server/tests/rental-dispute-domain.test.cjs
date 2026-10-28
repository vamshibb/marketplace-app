require('ts-node/register/transpile-only');

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const {
  OrderStatus,
  RentalDisputeStatus,
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
  findRentalDisputeByOrderId: async () => existingDispute,

  createRentalDispute: async (data) => {
    if (createError) {
      throw createError;
    }

    createdDispute = {
      id: 'dispute-1',
      ...data,
      createdAt: new Date('2026-10-28T00:00:00.000Z'),
      updatedAt: new Date('2026-10-28T00:00:00.000Z'),
    };

    return createdDispute;
  },
};

require.cache[rentalDisputeRepositoryId] =
  rentalDisputeRepositoryModule;

const {
  openRentalDispute,
} = require('../src/services/rentalDispute.service.ts');

beforeEach(() => {
  orders.clear();
  existingDispute = null;
  createdDispute = null;
  createError = null;
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