require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createUserRealtimePublisher } = require('../src/utils/userRealtimePublisher.ts');
const { StreamResponse } = require('./helpers/sse-response.cjs');
const event = { type: 'notification_created', data: { notificationId: 'n1' } };

test('private SSE isolates users and supports multiple connections without duplicate subscriptions', t => {
  const publisher = createUserRealtimePublisher();
  const a = new StreamResponse(), secondA = new StreamResponse(), b = new StreamResponse();
  t.after(() => [a, secondA, b].forEach(r => r.destroy()));
  publisher.subscribe('a', a); publisher.subscribe('a', secondA); publisher.subscribe('b', b);
  publisher.subscribe('a', a);
  publisher.subscribe('b', a); // An already-bound connection cannot change users.
  publisher.unsubscribe('b', a);
  assert.deepEqual(a.headers, {
    'Content-Type': 'text/event-stream', 'Cache-Control': 'private, no-store, no-transform',
    Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
  });
  assert.equal(a.flushed, true);
  assert.equal(a.frames.length, 1);
  assert.equal(a.frames[0], 'retry: 5000\nevent: connected\ndata: {"version":1}\n\n');
  publisher.publish('a', event);
  assert.deepEqual(a.events(event.type), [event.data]);
  assert.deepEqual(secondA.events(event.type), [event.data]);
  assert.deepEqual(b.events(event.type), []);
  a.destroy();
  publisher.publish('a', event);
  assert.equal(secondA.events(event.type).length, 2);
  assert.equal(a.events(event.type).length, 1);
});

for (const eventName of ['close', 'finish', 'error', 'aborted', 'request-error', 'unsubscribe']) {
  test(`private SSE ${eventName} clears listeners and heartbeat`, t => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const publisher = createUserRealtimePublisher(25);
    const response = new StreamResponse();
    t.after(() => response.destroy());
    publisher.subscribe('a', response);
    // GET request completion is not a stream disconnect.
    response.req.emit('close');
    t.mock.timers.tick(25);
    assert.equal(response.frames.at(-1), ': heartbeat\n\n');
    if (eventName === 'aborted') response.req.emit('aborted');
    else if (eventName === 'request-error') response.req.emit('error', new Error('closed'));
    else if (eventName === 'unsubscribe') publisher.unsubscribe('a', response);
    else response.emit(eventName);
    const frameCount = response.frames.length;
    publisher.publish('a', event);
    t.mock.timers.tick(100);
    assert.equal(response.frames.length, frameCount);
    assert.deepEqual(response.eventNames(), []);
    assert.deepEqual(response.req.eventNames(), []);
  });
}

test('backpressure, write errors, and even destroy failures do not interrupt healthy clients', t => {
  const publisher = createUserRealtimePublisher();
  const slow = new StreamResponse(), broken = new StreamResponse(), healthy = new StreamResponse();
  t.after(() => healthy.destroy());
  [slow, broken, healthy].forEach(r => publisher.subscribe('a', r));
  slow.acceptWrites = false;
  broken.write = () => { throw new Error('write failed'); };
  broken.destroy = () => { throw new Error('destroy failed'); };
  assert.doesNotThrow(() => publisher.publish('a', event));
  assert.equal(slow.destroyed, true);
  assert.deepEqual(broken.eventNames(), []);
  assert.deepEqual(broken.req.eventNames(), []);
  publisher.publish('a', event);
  assert.equal(healthy.events(event.type).length, 2);
  assert.equal(slow.events(event.type).length, 1);
});

test('heartbeat detects a slow client without waiting for a domain event', t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const publisher = createUserRealtimePublisher(25), response = new StreamResponse();
  publisher.subscribe('a', response);
  response.acceptWrites = false;
  t.mock.timers.tick(25);
  assert.equal(response.destroyed, true);
  const count = response.frames.length;
  t.mock.timers.tick(100);
  assert.equal(response.frames.length, count);
  assert.deepEqual(response.eventNames(), []);
});

test('initial header/write failures and already-closed requests retain no subscription', t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const publisher = createUserRealtimePublisher(25);
  for (const state of ['headers', 'write', 'aborted', 'destroyed', 'ended']) {
    const response = new StreamResponse();
    if (state === 'headers') response.flushHeaders = () => { throw new Error('headers failed'); };
    if (state === 'write') response.acceptWrites = false;
    if (state === 'aborted') response.req.aborted = true;
    if (state === 'destroyed') response.destroyed = true;
    if (state === 'ended') response.writableEnded = true;
    publisher.subscribe('a', response);
    const count = response.frames.length;
    publisher.publish('a', event);
    t.mock.timers.tick(100);
    assert.equal(response.frames.length, count);
    assert.deepEqual(response.eventNames(), []);
    assert.deepEqual(response.req.eventNames(), []);
  }
});

test('serialization failure is best effort and does not poison later delivery', t => {
  const publisher = createUserRealtimePublisher(), response = new StreamResponse();
  t.after(() => response.destroy()); publisher.subscribe('a', response);
  const circular = {}; circular.self = circular;
  assert.doesNotThrow(() => publisher.publish('a', { type: event.type, data: circular }));
  publisher.publish('a', event);
  assert.deepEqual(response.events(event.type), [event.data]);
});
