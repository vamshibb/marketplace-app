require('ts-node/register/transpile-only');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Module } = require('node:module');
const { once } = require('node:events');
const express = require('express');
const jwt = require('jsonwebtoken');
const secret = 'realtime-test-secret';
const configId = require.resolve('../src/config/env.ts');
const config = new Module(configId); config.exports = { env: { JWT_SECRET: secret } };
require.cache[configId] = config;
const { userRealtimePublisher } = require('../src/utils/userRealtimePublisher.ts');
const app = express();
app.use('/api', require('../src/routes/realtime.routes.ts').default);
app.use((error, req, res, next) => res.status(error.statusCode ?? 500).json({ message: error.message }));
let server, url;
before(async () => {
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  url = `http://127.0.0.1:${server.address().port}/api/realtime/stream`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
});

test('missing, invalid, expired, query-only and identity-less tokens never open SSE', async () => {
  const valid = jwt.sign({ userId: 'a' }, secret, { expiresIn: '5m' });
  for (const [suffix, headers] of [
    ['', {}], ['', { Authorization: 'Bearer invalid' }],
    ['', { Authorization: `Bearer ${jwt.sign({ userId: 'a' }, secret, { expiresIn: -1 })}` }],
    [`?token=${valid}`, {}], [`?access_token=${valid}`, {}],
    ['', { Cookie: `token=${valid}` }],
    ['', { Authorization: `Bearer ${jwt.sign({}, secret)}` }],
    ['', { Authorization: `Bearer ${jwt.sign({ userId: 123 }, secret)}` }],
  ]) {
    const response = await fetch(url + suffix, { headers });
    assert.equal(response.status, 401);
    assert.match(response.headers.get('content-type'), /application\/json/);
    await response.text();
  }
});

test('authenticated fetch streams only the JWT user even with a different query userId', { timeout: 5000 }, async t => {
  let connection, originalFinishListeners;
  const subscribe = userRealtimePublisher.subscribe;
  t.mock.method(userRealtimePublisher, 'subscribe', (id, response) => {
    connection = response;
    originalFinishListeners = response.listeners('finish');
    subscribe(id, response);
  });
  const abort = new AbortController(); t.after(() => abort.abort());
  const response = await fetch(url + '?userId=b', {
    headers: { Authorization: `Bearer ${jwt.sign({ userId: 'a' }, secret, { expiresIn: '5m' })}` },
    signal: abort.signal,
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let frames = decoder.decode((await reader.read()).value);
  assert.match(frames, /event: connected/);
  userRealtimePublisher.publish('b', { type: 'notification_created', data: { notificationId: 'private-b' } });
  userRealtimePublisher.publish('a', { type: 'notification_created', data: { notificationId: 'own-a' } });
  while (!frames.includes('own-a')) frames += decoder.decode((await reader.read()).value);
  assert.doesNotMatch(frames, /private-b/);
  const closed = once(connection, 'close'); abort.abort(); await closed;
  assert.equal(connection.listeners('finish').filter(listener => !originalFinishListeners.includes(listener)).length, 0);
  assert.equal(connection.req.listenerCount('aborted'), 0);
});
