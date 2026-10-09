require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAvailabilityPublisher } = require('../src/utils/availabilityPublisher.ts');
const { StreamResponse } = require('./helpers/sse-response.cjs');

test('SSE sends headers, retry hint, connected event and product-scoped invalidation', t => {
  const publisher = createAvailabilityPublisher();
  const a = new StreamResponse(), b = new StreamResponse();
  t.after(() => { a.destroy(); b.destroy(); });
  publisher.subscribe('a', a); publisher.subscribe('b', b);
  assert.deepEqual(a.headers, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  assert.equal(a.flushed, true);
  assert.match(a.frames[0], /retry: 5000\nevent: connected\ndata: {"productId":"a"}\n\n/);
  publisher.publishAvailabilityChanged('a', 'BLOCK_CREATED');
  assert.deepEqual(a.changes(), [{ productId: 'a', reason: 'BLOCK_CREATED' }]);
  assert.deepEqual(b.changes(), []);
});

for (const event of ['close', 'finish', 'error', 'aborted', 'request-error', 'unsubscribe']) {
  test(`SSE ${event} removes subscription, listeners and heartbeat`, t => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const publisher = createAvailabilityPublisher(25);
    const response = new StreamResponse();
    t.after(() => response.destroy());
    publisher.subscribe('a', response);
    t.mock.timers.tick(25);
    assert.equal(response.frames.at(-1), ': heartbeat\n\n');
    if (event === 'aborted') response.req.emit('aborted');
    else if (event === 'request-error') response.req.emit('error', new Error('closed'));
    else if (event === 'unsubscribe') publisher.unsubscribe('a', response);
    else response.emit(event);
    const count = response.frames.length;
    publisher.publishAvailabilityChanged('a', 'BLOCK_DELETED');
    t.mock.timers.tick(100);
    assert.equal(response.frames.length, count);
    assert.equal(response.eventNames().length, 0);
    assert.equal(response.req.eventNames().length, 0);
  });
}

test('slow or broken clients disconnect without interrupting other subscribers', t => {
  const publisher = createAvailabilityPublisher();
  const slow = new StreamResponse(), broken = new StreamResponse(), healthy = new StreamResponse();
  t.after(() => [slow, broken, healthy].forEach(r => r.destroy()));
  [slow, broken, healthy].forEach(r => publisher.subscribe('a', r));
  slow.acceptWrites = false;
  broken.write = () => { throw new Error('closed socket'); };
  publisher.publishAvailabilityChanged('a', 'RENTAL_ACCEPTED');
  assert.equal(slow.destroyed, true); assert.equal(broken.destroyed, true);
  publisher.publishAvailabilityChanged('a', 'RENTAL_COMPLETED');
  assert.equal(healthy.changes().length, 2);
  assert.equal(slow.changes().length, 1);
});
