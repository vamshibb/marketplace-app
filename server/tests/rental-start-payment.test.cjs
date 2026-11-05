require('ts-node/register/transpile-only');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Module } = require('node:module');
const { OrderStatus, PaymentStatus, ListingType } = require('../src/generated/prisma');

const orderRepositoryPath = require.resolve('../src/repositories/order.repository.ts');
const paymentServicePath = require.resolve('../src/services/payment.service.ts');
const notificationServicePath = require.resolve('../src/services/notification.service.ts');
const dtoPath = require.resolve('../src/dto/order.dto.ts');
const availabilityPublisherPath = require.resolve('../src/utils/availabilityPublisher.ts');
const orderServicePath = require.resolve('../src/services/order.service.ts');

const mockModule = (modulePath, exportsObject) => {
  const module = new Module(modulePath);
  module.exports = exportsObject;
  require.cache[modulePath] = module;
  return module;
};

const loadOrderService = ({
  orderRepositoryImpl,
  paymentServiceImpl,
  notificationImpl,
  dtoImpl,
}) => {
  mockModule(orderRepositoryPath, orderRepositoryImpl);
  mockModule(paymentServicePath, paymentServiceImpl);
  mockModule(notificationServicePath, notificationImpl);
  mockModule(dtoPath, dtoImpl);
  mockModule(availabilityPublisherPath, { publishAvailabilityChanged: () => undefined });
  delete require.cache[orderServicePath];
  return require('../src/services/order.service.ts');
};

test('transitionRental start captures before start and returns ACTIVE', async () => {
  const order = {
    id: 'rent-start-order-a',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    status: OrderStatus.ACCEPTED,
    transactionType: ListingType.RENT,
    productId: 'product-1',
    buyer: { id: 'buyer-1' },
    seller: { id: 'seller-1' },
    product: { id: 'product-1' },
    rentalDepositAmount: 0,
  };

  const sequence = [];
  let captureCalls = 0;
  let startCalls = 0;

  const service = loadOrderService({
    orderRepositoryImpl: {
      findOrderById: async () => order,
      startRentalAtomically: async () => {
        sequence.push('start');
        startCalls += 1;
        return { kind: 'started', order: { ...order, status: OrderStatus.ACTIVE } };
      },
    },
    paymentServiceImpl: {
      captureRentalPaymentForStart: async () => {
        sequence.push('capture');
        captureCalls += 1;
        return { id: 'pay-main', status: PaymentStatus.CAPTURED };
      },
    },
    notificationImpl: {
      notifyRentalTransition: async () => undefined,
    },
    dtoImpl: {
      toOrderDTO: (value) => value,
    },
  });

  const result = await service.transitionRental(order.id, 'seller-1', 'start');

  assert.equal(captureCalls, 1);
  assert.equal(startCalls, 1);
  assert.deepEqual(sequence, ['capture', 'start']);
  assert.equal(result.status, OrderStatus.ACTIVE);
  assert.equal(result.id, order.id);
});

test('transitionRental start stops before start when capture fails', async () => {
  const order = {
    id: 'rent-start-order-b',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    status: OrderStatus.ACCEPTED,
    transactionType: ListingType.RENT,
    productId: 'product-1',
    buyer: { id: 'buyer-1' },
    seller: { id: 'seller-1' },
    product: { id: 'product-1' },
    rentalDepositAmount: 0,
  };

  let startCalls = 0;
  const sequence = [];

  const service = loadOrderService({
    orderRepositoryImpl: {
      findOrderById: async () => order,
      startRentalAtomically: async () => {
        startCalls += 1;
        sequence.push('start');
        return { kind: 'started', order: { ...order, status: OrderStatus.ACTIVE } };
      },
    },
    paymentServiceImpl: {
      captureRentalPaymentForStart: async () => {
        sequence.push('capture');
        throw Object.assign(new Error('provider unavailable'), { statusCode: 409 });
      },
    },
    notificationImpl: {
      notifyRentalTransition: async () => undefined,
    },
    dtoImpl: {
      toOrderDTO: (value) => value,
    },
  });

  await assert.rejects(
    service.transitionRental(order.id, 'seller-1', 'start'),
    (error) => error && error.statusCode === 409 && error.message === 'provider unavailable'
  );

  assert.equal(startCalls, 0);
  assert.deepEqual(sequence, ['capture']);
  assert.equal(order.status, OrderStatus.ACCEPTED);
});

test('transitionRental start propagates repository final gate failure after capture', async () => {
  const order = {
    id: 'rent-start-order-c',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    status: OrderStatus.ACCEPTED,
    transactionType: ListingType.RENT,
    productId: 'product-1',
    buyer: { id: 'buyer-1' },
    seller: { id: 'seller-1' },
    product: { id: 'product-1' },
    rentalDepositAmount: 25,
  };

  const sequence = [];
  let startCalls = 0;
  let captureCalls = 0;

  const service = loadOrderService({
    orderRepositoryImpl: {
      findOrderById: async () => order,
      startRentalAtomically: async () => {
        sequence.push('start');
        startCalls += 1;
        return { kind: 'deposit-required' };
      },
    },
    paymentServiceImpl: {
      captureRentalPaymentForStart: async () => {
        sequence.push('capture');
        captureCalls += 1;
        return { id: 'pay-main', status: PaymentStatus.CAPTURED };
      },
    },
    notificationImpl: {
      notifyRentalTransition: async () => undefined,
    },
    dtoImpl: {
      toOrderDTO: (value) => value,
    },
  });

  await assert.rejects(
    service.transitionRental(order.id, 'seller-1', 'start'),
    (error) =>
      error &&
      error.statusCode === 409 &&
      error.message === 'Rental security deposit must be authorized before starting the rental.'
  );

  assert.equal(captureCalls, 1);
  assert.equal(startCalls, 1);
  assert.deepEqual(sequence, ['capture', 'start']);
});
