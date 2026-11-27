require('ts-node/register/transpile-only');

const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { Module } = require('node:module');
const express = require('express');
const jwt = require('jsonwebtoken');
const { RentalDisputeResolution, UserRole } = require('../src/generated/prisma');

const secret = 'rental-dispute-route-test-secret';
const provider = {};
const calls = [];
const users = new Map([
  ['buyer', { role: UserRole.USER }],
  ['seller', { role: UserRole.USER }],
  ['admin', { role: UserRole.ADMIN }],
]);

function stubModule(path, exports) {
  const id = require.resolve(path);
  const stub = new Module(id);
  stub.exports = exports;
  stub.loaded = true;
  require.cache[id] = stub;
}

stubModule('../src/config/env.ts', { env: { JWT_SECRET: secret } });
stubModule('../src/repositories/auth.repository.ts', {
  findUserById: async (id) => users.get(id) ?? null,
});
stubModule('../src/services/paymentProvider.ts', {
  getConfiguredPaymentProvider: () => provider,
});
stubModule('../src/services/rentalDispute.service.ts', {
  resolveRentalDispute: async (...args) => {
    calls.push(args);
    return { id: args[0], resolution: args[1] };
  },
});

const app = express();
app.use(express.json());
app.use('/api', require('../src/routes/rentalDispute.routes.ts').default);
app.use(require('../src/middleware/errorMiddleware.ts').errorMiddleware);

let server;
let url;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  url = `http://127.0.0.1:${server.address().port}/api/rental-disputes/dispute-1/resolve`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  calls.length = 0;
});

function resolveDispute(claims, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (claims) {
    headers.Authorization = `Bearer ${jwt.sign(claims, secret)}`;
  }
  return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
}

test('resolution rejects unauthenticated requests and deleted users', async () => {
  for (const claims of [null, { userId: 'deleted' }]) {
    const response = await resolveDispute(claims, {
      resolution: RentalDisputeResolution.CAPTURE_DEPOSIT,
    });
    assert.equal(response.status, 401);
    await response.json();
  }
  assert.deepEqual(calls, []);
});

test('buyers and sellers cannot resolve disputes even with an admin role claim', async () => {
  for (const userId of ['buyer', 'seller']) {
    const response = await resolveDispute({ userId, role: UserRole.ADMIN }, {
      resolution: RentalDisputeResolution.CAPTURE_DEPOSIT,
    });
    assert.equal(response.status, 403);
    await response.json();
  }
  assert.deepEqual(calls, []);
});

for (const resolution of Object.values(RentalDisputeResolution)) {
  test(`an administrator can resolve a dispute with ${resolution}`, async () => {
    const response = await resolveDispute({ userId: 'admin' }, { resolution });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.data, { id: 'dispute-1', resolution });
    assert.deepEqual(calls, [['dispute-1', resolution, provider]]);
  });
}

test('invalid and missing resolutions return 400 without calling the service', async () => {
  for (const resolution of ['REFUND', ['CAPTURE_DEPOSIT'], null, undefined]) {
    const response = await resolveDispute({ userId: 'admin' }, { resolution });
    assert.equal(response.status, 400);
    await response.json();
  }
  assert.deepEqual(calls, []);
});
