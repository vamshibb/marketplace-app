require('ts-node/register/transpile-only');
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { Module } = require('node:module');
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
  t.mock.method(console, 'error', () => {});
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
