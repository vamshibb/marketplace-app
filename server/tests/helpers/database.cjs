require('ts-node/register/transpile-only');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');

// Never silently select the application's normal database for retained tests.
if (!process.env.TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL to a migrated PostgreSQL test database. See tests/README.md.');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { prisma } = require('../../src/prisma/client.ts');

function fixtures() {
  const users = [], products = [];
  const tag = `regression-${randomUUID()}`;
  const fixture = {
    async setup() {
      for (const role of ['seller', 'buyer']) {
        const id = randomUUID(); users.push(id);
        fixture[role] = await prisma.user.create({ data: {
          id, email: `${tag}-${role}@example.invalid`, password: 'not-a-login-password', displayName: 'Regression fixture',
        } });
      }
    },
    async product(listingType = 'RENT', quantityAvailable = 3) {
      const id = randomUUID(); products.push(id);
      return prisma.product.create({ data: {
        id, sellerId: fixture.seller.id, title: tag, description: 'Isolated regression fixture', price: 10, listingType, quantityAvailable,
      } });
    },
    order(product, quantity = 1, status = 'PENDING', from = '2030-10-10', to = '2030-10-13') {
      return prisma.order.create({ data: {
        productId: product.id, productTitle: product.title, sellerId: fixture.seller.id, buyerId: fixture.buyer.id,
        transactionType: product.listingType, unitPrice: 10, quantity, status,
        ...(product.listingType === 'RENT' ? { requestedFrom: new Date(`${from}T00:00:00Z`), requestedTo: new Date(`${to}T00:00:00Z`) } : {}),
      } });
    },
    async cleanup() {
      try {
        // Restrict every delete to fixture IDs; no resets, truncation, or migrations.
        await prisma.$transaction(async tx => {
          await tx.notification.deleteMany({ where: { recipientId: { in: users } } });
          await tx.order.deleteMany({ where: { productId: { in: products } } });
          await tx.availabilityBlock.deleteMany({ where: { productId: { in: products } } });
          await tx.product.deleteMany({ where: { id: { in: products } } });
          await tx.user.deleteMany({ where: { id: { in: users } } });
        }, { maxWait: 10000, timeout: 15000 });
        assert.equal(await prisma.product.count({ where: { id: { in: products } } }), 0);
        assert.equal(await prisma.user.count({ where: { id: { in: users } } }), 0);
      } finally { await prisma.$disconnect(); }
    },
  };
  return fixture;
}

// Run real transactions with overlapping snapshots, without mocking queries,
// isolation, writes, rollback, or retry results. Tests in this file run serially.
async function raceTransactions(left, right) {
  const original = prisma.$transaction;
  let tickets = 0, arrivals = 0, release, timer;
  const gate = new Promise((resolve, reject) => {
    release = resolve;
    timer = setTimeout(() => reject(new Error('Both transactions must reach the overlap barrier')), 10000);
  });
  // Handle a failed setup without an unhandled rejection while operations settle.
  gate.catch(() => {});
  prisma.$transaction = (callback, options) => {
    const synchronize = tickets++ < 2;
    return original.call(prisma, async tx => {
      let waited = false;
      const wrapped = new Proxy(tx, { get(target, model) {
        const delegate = target[model];
        if (!delegate || typeof delegate.findUnique !== 'function') return delegate;
        return new Proxy(delegate, { get(object, method) {
          if (method !== 'findUnique') return object[method];
          return async (...args) => {
            const value = await object.findUnique(...args);
            if (synchronize && !waited) {
              waited = true;
              if (++arrivals === 2) { clearTimeout(timer); release(); }
              await gate;
            }
            return value;
          };
        } });
      } });
      return callback(wrapped);
    }, options);
  };
  try {
    const results = await Promise.allSettled([Promise.resolve().then(left), Promise.resolve().then(right)]);
    assert.equal(arrivals, 2, 'both real transactions overlapped');
    return results;
  } finally { clearTimeout(timer); prisma.$transaction = original; }
}

module.exports = { prisma, fixtures, raceTransactions };
