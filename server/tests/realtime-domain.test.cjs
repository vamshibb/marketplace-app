require('ts-node/register/transpile-only');
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { Module } = require('node:module');
const { Prisma, PaymentStatus, PaymentPurpose, OrderStatus } = require('../src/generated/prisma');
const { StreamResponse } = require('./helpers/sse-response.cjs');

// Exercise real services/DTOs and the real publisher, replacing only persistence.
// No application DB or credentials are loaded by this isolated suite.
const prismaId = require.resolve('../src/prisma/client.ts');
const prismaModule = new Module(prismaId); prismaModule.exports = { prisma: {} };
require.cache[prismaId] = prismaModule;
const conversations = require('../src/repositories/conversation.repository.ts');
const messages = require('../src/repositories/message.repository.ts');
const reads = require('../src/repositories/conversationRead.repository.ts');
const notifications = require('../src/repositories/notification.repository.ts');
const products = require('../src/repositories/product.repository.ts');
const messageService = require('../src/services/message.service.ts');
const conversationService = require('../src/services/conversation.service.ts');
const notificationService = require('../src/services/notification.service.ts');
const orderService = require('../src/services/order.service.ts');
const paymentService = require('../src/services/payment.service.ts');
const orderRepository = require('../src/repositories/order.repository.ts');
const authRepository = require('../src/repositories/auth.repository.ts');
const paymentRepository = require('../src/repositories/payment.repository.ts');
const { userRealtimePublisher } = require('../src/utils/userRealtimePublisher.ts');

const a = { id: 'a', email: 'a@example.test', displayName: 'A' };
const b = { id: 'b', email: 'b@example.test', displayName: 'B' };
const product = { id: 'p', title: 'Camera', sellerId: 'b' };
const conversation = {
  id: 'c', product, participants: [a, b].map(user => ({ userId: user.id, user })),
  lastMessageAt: new Date(), createdAt: new Date(),
};
const message = { id: 'm', conversationId: 'c', senderId: 'a', content: 'Hello', createdAt: new Date() };
const notification = {
  id: 'n', recipientId: 'b', sender: a, type: 'MESSAGE', title: 'New Message', body: 'Hello',
  metadata: { conversationId: 'c', messageId: 'm' }, isRead: false, createdAt: new Date(),
};

beforeEach(t => {
  t.mock.method(conversations, 'findConversationById', async () => conversation);
  t.mock.method(conversations, 'createConversationWithMessage', async () => ({ conversation, message }));
  t.mock.method(products, 'findProductOwner', async () => product);
  t.mock.method(messages, 'createMessageAndUpdateLastMessageAt', async () => message);
  t.mock.method(messages, 'findMessageById', async () => message);
  t.mock.method(reads, 'markConversationRead', async () => ({ conversationId: 'c', lastReadMessageId: 'm', updatedNotifications: 1 }));
  t.mock.method(notifications, 'createNotification', async () => notification);
  t.mock.method(notifications, 'createMessageNotification', async () => notification);
  t.mock.method(notifications, 'findNotificationById', async () => notification);
  t.mock.method(notifications, 'markNotificationAsRead', async () => ({ ...notification, isRead: true }));
  t.mock.method(notifications, 'markAllNotificationsAsRead', async () => ({ count: 1 }));
});

const connect = t => {
  const responses = { a: new StreamResponse(), anotherA: new StreamResponse(), b: new StreamResponse(), outsider: new StreamResponse() };
  for (const [key, response] of Object.entries(responses)) userRealtimePublisher.subscribe(key === 'anotherA' ? 'a' : key, response);
  t.after(() => Object.values(responses).forEach(r => r.destroy()));
  return responses;
};

const connectUsers = (t, userIds) => {
  const responses = Object.fromEntries(userIds.map(userId => [userId, new StreamResponse()]));
  for (const [userId, response] of Object.entries(responses)) {
    userRealtimePublisher.subscribe(userId, response);
  }
  t.after(() => Object.values(responses).forEach(response => response.destroy()));
  return responses;
};

test('sending a message notifies both participants/tabs, with notification only for the recipient', async t => {
  const clients = connect(t);
  const result = await messageService.sendMessage('c', 'a', ' Hello ');
  assert.deepEqual(result, { id: 'm', content: 'Hello', createdAt: message.createdAt, sender: a });
  const expected = [{ conversationId: 'c', messageId: 'm', senderId: 'a' }];
  for (const key of ['a', 'anotherA', 'b']) assert.deepEqual(clients[key].events('message_created'), expected);
  assert.deepEqual(clients.b.events('notification_created'), [{ notificationId: 'n' }]);
  assert.deepEqual(clients.a.events('notification_created'), []);
  assert.equal(clients.outsider.frames.length, 1);
  assert.deepEqual(messages.createMessageAndUpdateLastMessageAt.mock.calls[0].arguments, [{ conversationId: 'c', senderId: 'a', content: 'Hello' }]);
});

test('initial conversation message uses the same event contract after the repository commits', async t => {
  const clients = connect(t);
  let commit;
  t.mock.method(conversations, 'createConversationWithMessage', () => new Promise(resolve => { commit = resolve; }));
  const saving = conversationService.createConversation('p', 'a', 'Hello');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(clients.b.frames.length, 1);
  commit({ conversation, message });
  const result = await saving;
  assert.equal(result.id, 'c');
  for (const key of ['a', 'b']) assert.deepEqual(clients[key].events('message_created'), [{ conversationId: 'c', messageId: 'm', senderId: 'a' }]);
  assert.deepEqual(clients.b.events('notification_created'), [{ notificationId: 'n' }]);
  assert.equal(clients.outsider.frames.length, 1);
});

test('authorization, validation and repository failures publish no message events', async t => {
  const clients = connect(t);
  await assert.rejects(messageService.sendMessage('c', 'outsider', 'Hello'), e => e.statusCode === 403);
  await assert.rejects(messageService.sendMessage('c', 'a', '  '), e => e.statusCode === 400);
  t.mock.method(messages, 'createMessageAndUpdateLastMessageAt', async () => { throw new Error('commit failed'); });
  await assert.rejects(messageService.sendMessage('c', 'a', 'Hello'), /commit failed/);
  t.mock.method(conversations, 'createConversationWithMessage', async () => { throw new Error('commit failed'); });
  await assert.rejects(conversationService.createConversation('p', 'a', 'Hello'), /commit failed/);
  for (const response of Object.values(clients)) assert.equal(response.frames.length, 1);
});

test('read cursor broadcasts the committed cursor and privately invalidates changed message notifications', async t => {
  const clients = connect(t);
  // A stale acknowledgment must not broadcast its older requested cursor.
  const committed = { conversationId: 'c', lastReadMessageId: 'newer', updatedNotifications: 2 };
  t.mock.method(reads, 'markConversationRead', async () => committed);
  assert.equal(await conversationService.markConversationRead('c', 'b', 'm'), committed);
  for (const key of ['a', 'anotherA', 'b']) assert.deepEqual(clients[key].events('conversation_read_changed'), [
    { conversationId: 'c', userId: 'b', lastReadMessageId: 'newer' },
  ]);
  assert.deepEqual(clients.b.events('notification_read_changed'), [{ scope: 'conversation', conversationId: 'c' }]);
  assert.deepEqual(clients.a.events('notification_read_changed'), []);
  assert.equal(clients.outsider.frames.length, 1);
});

test('unchanged notifications are not signaled, and rejected read changes emit nothing', async t => {
  const clients = connect(t);
  await assert.rejects(conversationService.markConversationRead('c', 'outsider', 'm'), e => e.statusCode === 403);
  t.mock.method(messages, 'findMessageById', async () => ({ ...message, conversationId: 'other' }));
  await assert.rejects(conversationService.markConversationRead('c', 'b', 'm'), e => e.statusCode === 400);
  t.mock.method(messages, 'findMessageById', async () => message);
  t.mock.method(reads, 'markConversationRead', async () => { throw new Error('commit failed'); });
  await assert.rejects(conversationService.markConversationRead('c', 'b', 'm'), /commit failed/);
  for (const response of Object.values(clients)) assert.equal(response.frames.length, 1);
  t.mock.method(reads, 'markConversationRead', async () => ({ conversationId: 'c', lastReadMessageId: 'm', updatedNotifications: 0 }));
  await conversationService.markConversationRead('c', 'b', 'm');
  assert.deepEqual(clients.b.events('notification_read_changed'), []);
});

test('central notification creation covers orders/reviews and suppresses skipped or failed inserts', async t => {
  const clients = connect(t);
  const payload = { recipientId: 'b', sender: a, product, orderId: 'o' };
  await notificationService.notifyOrderCreated(payload);
  await notificationService.notifyReview({ recipientId: 'b', senderId: 'a', reviewId: 'r', reviewType: 'USER', orderId: 'o', productId: 'p' });
  assert.deepEqual(clients.b.events('notification_created'), [{ notificationId: 'n' }, { notificationId: 'n' }]);
  await notificationService.notifyOrderCreated({ ...payload, recipientId: 'a' });
  t.mock.method(notifications, 'createMessageNotification', async () => null);
  await notificationService.notifyMessage({ ...payload, conversationId: 'c', messageId: 'm' });
  t.mock.method(console, 'error', () => { });
  t.mock.method(notifications, 'createNotification', async () => { throw new Error('DB failed'); });
  await notificationService.notifyOrderCreated(payload);
  assert.equal(clients.b.events('notification_created').length, 2);
  assert.equal(clients.a.frames.length, 1);
  assert.equal(clients.outsider.frames.length, 1);
});

test('notification single/all read events reach only the recipient and preserve responses', async t => {
  const clients = connect(t);
  await assert.rejects(notificationService.markAsRead('n', 'a'), e => e.statusCode === 403);
  const result = await notificationService.markAsRead('n', 'b');
  assert.equal(result.isRead, true); assert.equal(result.id, 'n');
  assert.deepEqual(await notificationService.markAllAsRead('b'), { count: 1 });
  assert.deepEqual(clients.b.events('notification_read_changed'), [
    { scope: 'notification', notificationId: 'n' }, { scope: 'all' },
  ]);
  t.mock.method(notifications, 'findNotificationById', async () => ({ ...notification, isRead: true }));
  t.mock.method(notifications, 'markAllNotificationsAsRead', async () => ({ count: 0 }));
  await notificationService.markAsRead('n', 'b'); await notificationService.markAllAsRead('b');
  assert.equal(clients.b.events('notification_read_changed').length, 2);
  for (const key of ['a', 'anotherA', 'outsider']) assert.equal(clients[key].frames.length, 1);
});

test('notification write failures publish nothing', async t => {
  const clients = connect(t);
  t.mock.method(notifications, 'markNotificationAsRead', async () => { throw new Error('update failed'); });
  t.mock.method(notifications, 'markAllNotificationsAsRead', async () => { throw new Error('update failed'); });
  await assert.rejects(notificationService.markAsRead('n', 'b'), /update failed/);
  await assert.rejects(notificationService.markAllAsRead('b'), /update failed/);
  for (const response of Object.values(clients)) assert.equal(response.frames.length, 1);
});

test('publisher failure cannot fail otherwise successful message, conversation or notification actions', async t => {
  t.mock.method(userRealtimePublisher, 'publish', () => { throw new Error('transport unavailable'); });
  assert.equal((await messageService.sendMessage('c', 'a', 'Hello')).id, 'm');
  assert.equal((await conversationService.createConversation('p', 'a', 'Hello')).id, 'c');
  assert.equal((await conversationService.markConversationRead('c', 'b', 'm')).lastReadMessageId, 'm');
  assert.equal((await notificationService.markAsRead('n', 'b')).isRead, true);
  assert.deepEqual(await notificationService.markAllAsRead('b'), { count: 1 });
  await notificationService.notifyOrderCreated({ recipientId: 'b', sender: a, product, orderId: 'o' });
  assert.equal(notifications.createNotification.mock.callCount(), 1);
  assert.equal(notifications.createMessageNotification.mock.callCount(), 2);
  assert.ok(userRealtimePublisher.publish.mock.callCount() > 0);
});

test('acceptOrder success publishes order_changed to both participants, conflicts emit nothing', async t => {
  const clients = connectUsers(t, ['buyer-1', 'seller-1', 'outsider']);
  const order = {
    id: 'o-order', buyerId: 'buyer-1', sellerId: 'seller-1', productId: 'p', productTitle: 'Camera',
    status: OrderStatus.PENDING, transactionType: 'SALE', quantity: 1,
    unitPrice: new Prisma.Decimal('10.00'), currency: 'USD', subtotal: new Prisma.Decimal('10.00'),
    rentalDays: null, rentalDepositAmount: null,
    product: { id: 'p', title: 'Camera' },
    buyer: { id: 'buyer-1', email: 'buyer-1@example.test', displayName: 'Buyer 1' },
    seller: { id: 'seller-1', email: 'seller-1@example.test', displayName: 'Seller 1' },
    payments: [{ purpose: PaymentPurpose.SALE, status: PaymentStatus.AUTHORIZED }],
    requestedFrom: null, requestedTo: null, notes: null,
    createdAt: new Date(), updatedAt: new Date(),
  };

  t.mock.method(orderRepository, 'findOrderById', async () => order);
  t.mock.method(orderRepository, 'acceptSaleOrder', async () => ({ kind: 'accepted', order: { ...order, status: OrderStatus.ACCEPTED } }));
  t.mock.method(authRepository, 'findUserById', async (id) => ({ id, email: `${id}@example.test`, displayName: id }));
  t.mock.method(notificationService, 'notifyOrderAccepted', async () => ({ id: 'n-order' }));

  const accepted = await orderService.acceptOrder('o-order', 'seller-1');
  assert.equal(accepted.id, 'o-order');
  assert.deepEqual(clients['buyer-1'].events('order_changed'), [{ orderId: 'o-order' }]);
  assert.deepEqual(clients['seller-1'].events('order_changed'), [{ orderId: 'o-order' }]);
  assert.deepEqual(clients.outsider.events('order_changed'), []);

  t.mock.method(orderRepository, 'acceptSaleOrder', async () => ({ kind: 'conflict' }));
  await assert.rejects(orderService.acceptOrder('o-order', 'seller-1'), /Order or stock changed concurrently/);
  assert.equal(clients['buyer-1'].events('order_changed').length, 1);
  assert.equal(clients['seller-1'].events('order_changed').length, 1);
});

test('rental transition success publishes after persistence, failed transitions emit nothing', async t => {
  const clients = connectUsers(t, ['buyer-1', 'seller-1', 'outsider']);
  const order = {
    id: 'r-order', buyerId: 'buyer-1', sellerId: 'seller-1', productId: 'p', productTitle: 'Camera',
    status: OrderStatus.ACCEPTED, transactionType: 'RENT',
    quantity: 1, unitPrice: new Prisma.Decimal('50.00'), currency: 'USD', subtotal: new Prisma.Decimal('50.00'),
    rentalDays: 3, rentalDepositAmount: new Prisma.Decimal('25.00'),
    product: { id: 'p', title: 'Camera' },
    buyer: { id: 'buyer-1', email: 'buyer-1@example.test', displayName: 'Buyer 1' },
    seller: { id: 'seller-1', email: 'seller-1@example.test', displayName: 'Seller 1' },
    payments: [{ purpose: PaymentPurpose.RENT, status: PaymentStatus.AUTHORIZED }],
    requestedFrom: new Date('2026-01-01T00:00:00.000Z'), requestedTo: new Date('2026-01-04T00:00:00.000Z'), notes: null,
    createdAt: new Date(), updatedAt: new Date(),
  };

  t.mock.method(orderRepository, 'findOrderById', async () => order);
  t.mock.method(paymentService, 'captureRentalPaymentForStart', async () => ({ id: 'pay-r', status: PaymentStatus.CAPTURED }));
  t.mock.method(orderRepository, 'startRentalAtomically', async () => ({
    kind: 'started',
    order: { ...order, status: OrderStatus.ACTIVE },
  }));
  t.mock.method(notificationService, 'notifyRentalTransition', async () => ({ id: 'notify-r' }));

  const started = await orderService.transitionRental('r-order', 'seller-1', 'start');
  assert.equal(started.id, 'r-order');
  assert.deepEqual(clients['buyer-1'].events('order_changed'), [{ orderId: 'r-order' }]);
  assert.deepEqual(clients['seller-1'].events('order_changed'), [{ orderId: 'r-order' }]);
  assert.deepEqual(clients.outsider.events('order_changed'), []);

  t.mock.method(orderRepository, 'startRentalAtomically', async () => ({ kind: 'conflict' }));
  await assert.rejects(orderService.transitionRental('r-order', 'seller-1', 'start'), /Rental state changed concurrently/);
  assert.equal(clients['buyer-1'].events('order_changed').length, 1);
  assert.equal(clients['seller-1'].events('order_changed').length, 1);
});

test('successful payment status persistence publishes order_changed, failed persistence emits nothing', async t => {
  const clients = connectUsers(t, ['buyer-1', 'seller-1', 'outsider']);
  const provider = {
    name: 'mock-provider',
    capture: async () => ({ provider: 'mock-provider', providerPaymentId: 'pay-1', status: PaymentStatus.CAPTURED, metadata: { captured: true } }),
  };
  const payment = {
    id: 'pay-1',
    orderId: 'o-payment',
    purpose: PaymentPurpose.RENT,
    amount: new Prisma.Decimal('10.00'),
    currency: 'USD',
    status: PaymentStatus.AUTHORIZED,
    idempotencyKey: 'key-1',
    provider: 'mock-provider',
    providerPaymentId: 'pay-1',
    metadata: null,
    order: { buyerId: 'buyer-1', sellerId: 'seller-1' },
  };

  t.mock.method(paymentRepository, 'findPaymentById', async () => payment);
  t.mock.method(paymentRepository, 'updatePaymentStatus', async (id, status, data = {}) => ({
    ...payment,
    id,
    status,
    provider: data.provider ?? payment.provider,
    providerPaymentId: data.providerPaymentId ?? payment.providerPaymentId,
    metadata: data.metadata ?? payment.metadata,
    order: payment.order,
  }));

  const updated = await paymentService.capturePayment('pay-1', provider);
  assert.equal(updated.status, PaymentStatus.CAPTURED);
  assert.deepEqual(clients['buyer-1'].events('order_changed'), [{ orderId: 'o-payment' }]);
  assert.deepEqual(clients['seller-1'].events('order_changed'), [{ orderId: 'o-payment' }]);
  assert.deepEqual(clients.outsider.events('order_changed'), []);

  t.mock.method(paymentRepository, 'updatePaymentStatus', async () => { throw new Error('persist failed'); });
  await assert.rejects(paymentService.capturePayment('pay-1', provider), /persist failed/);
  assert.equal(clients['buyer-1'].events('order_changed').length, 1);
  assert.equal(clients['seller-1'].events('order_changed').length, 1);
});

test('webhook-driven payment transitions emit order_changed once; duplicate/ignored webhooks do not emit', async t => {
  const clients = connectUsers(t, ['buyer-1', 'seller-1', 'outsider']);
  const provider = {
    name: 'mock-provider',
    verifyWebhook: async () => ({
      provider: 'mock-provider',
      providerEventId: 'evt-1',
      eventType: 'payment.captured',
      providerPaymentId: 'prov-webhook-1',
      paymentStatus: PaymentStatus.CAPTURED,
      occurredAt: new Date(),
    }),
  };
  const payment = {
    id: 'pay-web',
    orderId: 'order-web',
    purpose: PaymentPurpose.RENT,
    amount: new Prisma.Decimal('100.00'),
    currency: 'USD',
    status: PaymentStatus.AUTHORIZED,
    idempotencyKey: 'key-web',
    provider: 'mock-provider',
    providerPaymentId: 'prov-webhook-1',
    metadata: null,
    order: { buyerId: 'buyer-1', sellerId: 'seller-1' },
  };

  t.mock.method(paymentRepository, 'claimWebhookEvent', async () => ({
    event: { id: 'evt-db', status: 'PROCESSING', paymentId: 'pay-web' },
    claimed: true,
    created: true,
    state: 'claimed',
  }));
  t.mock.method(paymentRepository, 'findPaymentByProviderReference', async () => payment);
  t.mock.method(paymentRepository, 'finalizeWebhookTransition', async () => ({
    event: { id: 'evt-db', status: 'PROCESSED' },
    payment: { ...payment, status: PaymentStatus.CAPTURED, order: payment.order },
  }));

  const processed = await paymentService.processWebhookEvent('mock-provider', 'raw', {}, provider);
  assert.equal(processed.acknowledged, true);
  assert.deepEqual(clients['buyer-1'].events('order_changed'), [{ orderId: 'order-web' }]);
  assert.deepEqual(clients['seller-1'].events('order_changed'), [{ orderId: 'order-web' }]);
  assert.deepEqual(clients.outsider.events('order_changed'), []);

  t.mock.method(paymentRepository, 'claimWebhookEvent', async () => ({
    event: { id: 'evt-db-dup', status: 'PROCESSED', paymentId: 'pay-web' },
    claimed: true,
    created: false,
    state: 'duplicate',
  }));
  t.mock.method(paymentRepository, 'findPaymentById', async () => ({ ...payment, status: PaymentStatus.CAPTURED, order: payment.order }));

  await paymentService.processWebhookEvent('mock-provider', 'raw', {}, provider);
  assert.equal(clients['buyer-1'].events('order_changed').length, 1);
  assert.equal(clients['seller-1'].events('order_changed').length, 1);

  t.mock.method(paymentRepository, 'claimWebhookEvent', async () => ({
    event: { id: 'evt-db-stale', status: 'PROCESSING', paymentId: 'pay-web' },
    claimed: true,
    created: true,
    state: 'claimed',
  }));
  t.mock.method(paymentRepository, 'findPaymentByProviderReference', async () => ({ ...payment, status: PaymentStatus.CAPTURED, order: payment.order }));
  t.mock.method(paymentRepository, 'finalizeWebhookTransition', async () => ({
    event: { id: 'evt-db-stale', status: 'IGNORED' },
    payment: { ...payment, status: PaymentStatus.CAPTURED, order: payment.order },
  }));

  await paymentService.processWebhookEvent('mock-provider', 'raw', {
    'stripe-signature': 'stale',
  }, {
    ...provider,
    verifyWebhook: async () => ({
      provider: 'mock-provider',
      providerEventId: 'evt-stale',
      eventType: 'payment.authorized',
      providerPaymentId: 'prov-webhook-1',
      paymentStatus: PaymentStatus.AUTHORIZED,
      occurredAt: new Date(),
    }),
  });
  assert.equal(clients['buyer-1'].events('order_changed').length, 1);
  assert.equal(clients['seller-1'].events('order_changed').length, 1);

  t.mock.method(paymentRepository, 'claimWebhookEvent', async () => ({
    event: { id: 'evt-db-dup', status: 'PROCESSING', paymentId: 'pay-web' },
    claimed: true,
    created: true,
    state: 'claimed',
  }));
  t.mock.method(paymentRepository, 'findPaymentByProviderReference', async () => ({ ...payment, status: PaymentStatus.CAPTURED, order: payment.order }));
  t.mock.method(paymentRepository, 'finalizeWebhookTransition', async () => ({
    event: { id: 'evt-db-dup', status: 'PROCESSED' },
    payment: { ...payment, status: PaymentStatus.CAPTURED, order: payment.order },
  }));

  await paymentService.processWebhookEvent('mock-provider', 'raw', {}, provider);
  assert.equal(clients['buyer-1'].events('order_changed').length, 1);
  assert.equal(clients['seller-1'].events('order_changed').length, 1);
});
