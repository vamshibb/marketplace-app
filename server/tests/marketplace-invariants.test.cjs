const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { prisma, fixtures, raceTransactions } = require('./helpers/database.cjs');
const orders = require('../src/services/order.service.ts');
const products = require('../src/services/product.service.ts');
const blocks = require('../src/services/availabilityBlock.service.ts');
const { getProductAvailability } = require('../src/services/availability.service.ts');
const { openAvailabilityStream } = require('../src/services/availabilityStream.service.ts');
const { StreamResponse } = require('./helpers/sse-response.cjs');
const f = fixtures();
before(() => f.setup());
after(() => f.cleanup());
const conflict = error => error.statusCode === 409;
const window = { from: '2030-10-10', to: '2030-10-13' };
const blockInput = (quantity = 1, blockedFrom = window.from, blockedTo = window.to) => ({ quantity, blockedFrom, blockedTo });
const stock = id => prisma.product.findUniqueOrThrow({ where: { id } }).then(p => p.quantityAvailable);
const status = id => prisma.order.findUniqueOrThrow({ where: { id } }).then(o => o.status);
const accept = order => orders.acceptOrder(order.id, f.seller.id);
const edit = (product, input) => products.updateProduct(product.id, input, f.seller.id);
const block = (product, input = blockInput()) => blocks.createBlock(product.id, f.seller.id, input);
const days = product => getProductAvailability(product.id, window).then(a => a.days);
function oneWinner(results) {
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const failures = results.filter(r => r.status === 'rejected');
  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason.statusCode, 409,
    `Unexpected losing error: ${failures[0].reason.name} ${failures[0].reason.code ?? ''}: ${failures[0].reason.message}`);
}
async function listen(t, product) {
  const response = new StreamResponse();
  t.after(() => response.destroy());
  await openAvailabilityStream(product.id, response);
  return response;
}

for (const committed of ['ACCEPTED', 'ACTIVE', 'RETURN_PENDING']) {
  test(`RENT ${committed} and owner blocks consume shared capacity`, async t => {
    const p = await f.product('RENT', 4);
    await f.order(p, 2, committed);
    await block(p);
    const response = await listen(t, p);
    const tooLarge = await f.order(p, 2), fits = await f.order(p, 1);
    await assert.rejects(accept(tooLarge), conflict);
    assert.equal(await status(tooLarge.id), 'PENDING');
    assert.deepEqual(response.changes(), []);
    await accept(fits);
    assert.equal(await status(fits.id), 'ACCEPTED');
    assert.equal(await stock(p.id), 4, 'rental acceptance does not decrement listing inventory');
    for (const day of await days(p)) {
      assert.equal(day.reservedQuantity, 3); assert.equal(day.blockedQuantity, 1); assert.equal(day.availableQuantity, 0);
    }
    assert.deepEqual(response.changes(), [{ productId: p.id, reason: 'RENTAL_ACCEPTED' }]);
  });
}

test('RENT ignores noncommitted orders and respects exclusive end dates', async () => {
  const p = await f.product('RENT', 2);
  for (const s of ['PENDING', 'REJECTED', 'CANCELLED', 'COMPLETED']) await f.order(p, 2, s);
  await f.order(p, 2, 'ACCEPTED', '2030-10-07', window.from);
  await block(p, blockInput(2, window.to, '2030-10-16'));
  const order = await f.order(p, 2);
  await accept(order);
  assert.equal(await status(order.id), 'ACCEPTED');
  assert.ok((await days(p)).every(day => day.reservedQuantity === 2 && day.blockedQuantity === 0));
});

test('concurrent RENT accepts cannot overbook; only the committed winner publishes', async t => {
  const p = await f.product('RENT', 2);
  const a = await f.order(p, 2), b = await f.order(p, 2);
  const response = await listen(t, p);
  oneWinner(await raceTransactions(() => accept(a), () => accept(b)));
  assert.deepEqual((await Promise.all([status(a.id), status(b.id)])).sort(), ['ACCEPTED', 'PENDING']);
  assert.ok((await days(p)).every(day => day.reservedQuantity === 2));
  assert.deepEqual(response.changes(), [{ productId: p.id, reason: 'RENTAL_ACCEPTED' }]);
});

test('blocks sum with committed rentals; rejected creation writes/publishes nothing; deletion restores capacity', async t => {
  const p = await f.product('RENT', 4);
  await f.order(p, 2, 'ACTIVE');
  const response = await listen(t, p);
  const a = await block(p), b = await block(p);
  await assert.rejects(block(p), conflict);
  assert.equal(await prisma.availabilityBlock.count({ where: { productId: p.id } }), 2);
  assert.ok((await days(p)).every(day => day.availableQuantity === 0 && day.blockedQuantity === 2));
  await assert.rejects(blocks.deleteBlock(p.id, a.id, f.buyer.id), e => e.statusCode === 403);
  await blocks.deleteBlock(p.id, a.id, f.seller.id);
  await assert.rejects(blocks.deleteBlock(p.id, a.id, f.seller.id), e => e.statusCode === 404);
  assert.ok((await days(p)).every(day => day.availableQuantity === 1 && day.blockedQuantity === 1));
  assert.deepEqual(response.changes().map(e => e.reason), ['BLOCK_CREATED', 'BLOCK_CREATED', 'BLOCK_DELETED']);
  assert.ok(await prisma.availabilityBlock.findUnique({ where: { id: b.id } }));
});

test('concurrent owner blocks cannot exceed inventory', async t => {
  const p = await f.product('RENT', 2);
  const response = await listen(t, p);
  oneWinner(await raceTransactions(() => block(p, blockInput(2)), () => block(p, blockInput(2))));
  assert.equal(await prisma.availabilityBlock.count({ where: { productId: p.id } }), 1);
  assert.ok((await days(p)).every(day => day.blockedQuantity === 2));
  assert.deepEqual(response.changes(), [{ productId: p.id, reason: 'BLOCK_CREATED' }]);
});

test('concurrent block creation and rental acceptance share the same capacity', async t => {
  const p = await f.product('RENT', 2), order = await f.order(p, 2);
  const response = await listen(t, p);
  const results = await raceTransactions(() => block(p, blockInput(2)), () => accept(order));
  oneWinner(results);
  assert.ok((await days(p)).every(day => day.reservedQuantity + day.blockedQuantity === 2));
  assert.equal(await status(order.id), results[1].status === 'fulfilled' ? 'ACCEPTED' : 'PENDING');
  assert.equal(response.changes().length, 1);
});

test('RENT reduction protects peak rental/block commitments while normal edits and increases work', async () => {
  const p = await f.product('RENT', 5);
  await f.order(p, 2, 'RETURN_PENDING'); await block(p, blockInput(2));
  await assert.rejects(edit(p, { quantityAvailable: 3 }), conflict);
  assert.equal(await stock(p.id), 5);
  await edit(p, { quantityAvailable: 4 }); assert.equal(await stock(p.id), 4);
  await edit(p, { title: 'Updated listing', price: 25, quantityAvailable: 6 }); assert.equal(await stock(p.id), 6);
});

test('RENT reduction uses peak, not total, and pending requests do not reserve capacity', async () => {
  const p = await f.product('RENT', 5);
  await f.order(p, 2, 'ACCEPTED');
  await block(p, blockInput(2, window.to, '2030-10-16'));
  await f.order(p, 5, 'PENDING');
  await edit(p, { quantityAvailable: 2 }); assert.equal(await stock(p.id), 2);
});

test('quantity reduction racing rental acceptance preserves committed capacity', async () => {
  const p = await f.product('RENT', 3), order = await f.order(p, 3);
  oneWinner(await raceTransactions(() => edit(p, { quantityAvailable: 1 }), () => accept(order)));
  const capacity = await stock(p.id);
  assert.ok((await days(p)).every(day => day.reservedQuantity + day.blockedQuantity <= capacity));
  assert.equal(await status(order.id), capacity === 3 ? 'ACCEPTED' : 'PENDING');
});

test('quantity reduction racing block creation preserves committed capacity', async () => {
  const p = await f.product('RENT', 3);
  const results = await raceTransactions(() => edit(p, { quantityAvailable: 1 }), () => block(p, blockInput(3)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const failure = results.find(r => r.status === 'rejected');
  // A block retried against the now-smaller inventory uses the existing 400
  // quantity validation; a reduction retried against the block is a 409.
  assert.ok([400, 409].includes(failure.reason.statusCode));
  const capacity = await stock(p.id);
  assert.ok((await days(p)).every(day => day.reservedQuantity + day.blockedQuantity <= capacity));
});

test('RENT to SALE racing a new pending rental cannot leave a SALE product with a rental request', async () => {
  const p = await f.product();
  oneWinner(await raceTransactions(
    () => edit(p, { listingType: 'SALE' }),
    () => orders.createOrder(p.id, f.buyer.id, {
      quantity: 1, requestedFrom: new Date(`${window.from}T00:00:00Z`), requestedTo: new Date(`${window.to}T00:00:00Z`),
    }),
  ));
  const current = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
  const pending = await prisma.order.count({ where: { productId: p.id, transactionType: 'RENT', status: 'PENDING' } });
  assert.equal(pending, current.listingType === 'SALE' ? 0 : 1);
});

for (const state of ['PENDING', 'ACCEPTED', 'ACTIVE', 'RETURN_PENDING', 'BLOCK']) {
  test(`RENT to SALE is blocked by ${state}`, async () => {
    const p = await f.product();
    if (state === 'BLOCK') await block(p); else await f.order(p, 1, state);
    await assert.rejects(edit(p, { listingType: 'SALE' }), conflict);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).listingType, 'RENT');
  });
}

test('terminal rental history permits SALE conversion', async () => {
  const p = await f.product();
  for (const s of ['REJECTED', 'CANCELLED', 'COMPLETED']) await f.order(p, 1, s);
  assert.equal((await edit(p, { listingType: 'SALE' })).listingType, 'SALE');
});

test('SALE accepts exactly once, reaches zero, and completion does not decrement again', async () => {
  const p = await f.product('SALE', 2), order = await f.order(p, 2);
  await accept(order); assert.equal(await stock(p.id), 0); assert.equal(await status(order.id), 'ACCEPTED');
  await assert.rejects(accept(order), conflict); assert.equal(await stock(p.id), 0);
  await orders.completeOrder(order.id, f.buyer.id);
  assert.equal(await stock(p.id), 0); assert.equal(await status(order.id), 'COMPLETED');
});

test('SALE insufficient stock or changed listing type leaves stock/order unchanged', async () => {
  const p = await f.product('SALE', 1), order = await f.order(p, 2);
  await assert.rejects(accept(order), conflict);
  assert.equal(await stock(p.id), 1); assert.equal(await status(order.id), 'PENDING');
  await edit(p, { listingType: 'RENT', quantityAvailable: 3 });
  await assert.rejects(accept(order), conflict);
  assert.equal(await stock(p.id), 3); assert.equal(await status(order.id), 'PENDING');
});

test('concurrent SALE accepts cannot oversell and leave loser pending', async () => {
  const p = await f.product('SALE', 2), a = await f.order(p, 2), b = await f.order(p, 2);
  oneWinner(await raceTransactions(() => accept(a), () => accept(b)));
  assert.equal(await stock(p.id), 0);
  assert.deepEqual((await Promise.all([status(a.id), status(b.id)])).sort(), ['ACCEPTED', 'PENDING']);
});

test('concurrent duplicate SALE accept decrements once even when stock could cover both', async () => {
  const p = await f.product('SALE', 5), order = await f.order(p, 2);
  oneWinner(await raceTransactions(() => accept(order), () => accept(order)));
  assert.equal(await stock(p.id), 3); assert.equal(await status(order.id), 'ACCEPTED');
});

test('pending SALE creation/reject/cancel never reserves stock or emits availability changes', async () => {
  const p = await f.product('SALE', 3);
  const response = new StreamResponse();
  const publisher = require('../src/utils/availabilityPublisher.ts');
  publisher.subscribe(p.id, response);
  try {
    await assert.rejects(orders.createOrder(p.id, f.buyer.id, { quantity: 4 }), conflict);
    const a = await orders.createOrder(p.id, f.buyer.id, { quantity: 3 });
    await orders.rejectOrder(a.id, f.seller.id);
    const b = await orders.createOrder(p.id, f.buyer.id, { quantity: 3 });
    await orders.cancelOrder(b.id, f.buyer.id);
    const c = await orders.createOrder(p.id, f.buyer.id, { quantity: 3 });
    assert.equal(await stock(p.id), 3);
    await orders.acceptOrder(c.id, f.seller.id); await orders.completeOrder(c.id, f.buyer.id);
    assert.equal(await stock(p.id), 0); assert.deepEqual(response.changes(), []);
  } finally { response.destroy(); }
});

test('rental SSE lifecycle emits acceptance/completion only, never pending/reject/cancel/start/return/failures', async t => {
  const p = await f.product('RENT', 1), response = await listen(t, p);
  const request = { quantity: 1, requestedFrom: new Date(`${window.from}T00:00:00Z`), requestedTo: new Date(`${window.to}T00:00:00Z`) };
  const cancelled = await orders.createOrder(p.id, f.buyer.id, request);
  await orders.cancelOrder(cancelled.id, f.buyer.id);
  const rejected = await orders.createOrder(p.id, f.buyer.id, request);
  await orders.rejectOrder(rejected.id, f.seller.id);
  const order = await orders.createOrder(p.id, f.buyer.id, request);
  assert.deepEqual(response.changes(), []);
  await orders.acceptOrder(order.id, f.seller.id);
  await assert.rejects(orders.acceptOrder(order.id, f.seller.id), conflict);
  await orders.transitionRental(order.id, f.seller.id, 'start');
  await orders.transitionRental(order.id, f.buyer.id, 'return');
  assert.deepEqual(response.changes(), [{ productId: p.id, reason: 'RENTAL_ACCEPTED' }]);
  await orders.transitionRental(order.id, f.seller.id, 'confirm-return');
  await assert.rejects(orders.transitionRental(order.id, f.seller.id, 'confirm-return'), conflict);
  assert.equal(await status(order.id), 'COMPLETED');
  assert.deepEqual(response.changes(), [
    { productId: p.id, reason: 'RENTAL_ACCEPTED' }, { productId: p.id, reason: 'RENTAL_COMPLETED' },
  ]);
});
