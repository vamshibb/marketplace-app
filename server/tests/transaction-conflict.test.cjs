require('ts-node/register/transpile-only');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Module } = require('node:module');
const { Prisma } = require('../src/generated/prisma');
const { StreamResponse } = require('./helpers/sse-response.cjs');
let attempts = 0, failure;
const id = require.resolve('../src/prisma/client.ts');
const moduleStub = new Module(id);
// Model a transaction that failed at COMMIT, after Prisma left its query wrapper.
// Real rollback/capacity races are covered by the PostgreSQL integration suite.
moduleStub.exports = { prisma: { $transaction: async () => { attempts++; throw failure; } } };
require.cache[id] = moduleStub;
const { createBlock } = require('../src/services/availabilityBlock.service.ts');
const { subscribe } = require('../src/utils/availabilityPublisher.ts');
const adapterConflict = Object.assign(new Error('TransactionWriteConflict'), {
  name: 'DriverAdapterError', cause: { kind: 'TransactionWriteConflict' },
});

for (const [name, error] of [
  ['Prisma query-time', new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' })],
  ['adapter commit-time', adapterConflict],
]) {
  test(`${name} conflicts retry, end as 409, and publish nothing`, async t => {
    attempts = 0; failure = error;
    const response = new StreamResponse(); subscribe('p', response); t.after(() => response.destroy());
    await assert.rejects(createBlock('p', 'owner', { blockedFrom: '2030-10-10', blockedTo: '2030-10-13', quantity: 1 }), e => e.statusCode === 409);
    assert.equal(attempts, 3);
    assert.deepEqual(response.changes(), []);
  });
}

test('unrelated database errors are not retried or mislabeled as inventory conflicts', async () => {
  attempts = 0; failure = Object.assign(new Error('Connection closed'), { name: 'DriverAdapterError', cause: { kind: 'ConnectionClosed' } });
  await assert.rejects(createBlock('p', 'owner', { blockedFrom: '2030-10-10', blockedTo: '2030-10-13', quantity: 1 }), e => e === failure);
  assert.equal(attempts, 1);
});
