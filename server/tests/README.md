# Backend regression tests

Uses the existing Node `node:test` runner, strict assertions, and `ts-node/register/transpile-only`. No extra test dependency is required.

## Run

From `server`, install dependencies and generate Prisma's client (`npm run prisma:generate`). Provide a **dedicated PostgreSQL test database** with the current migrations applied:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://USER:PASSWORD@HOST:5432/marketplace_test'

node --test tests/display-name.test.cjs tests/availability-stream.test.cjs tests/transaction-conflict.test.cjs tests/marketplace-invariants.test.cjs

npm run build
```

The command above runs all retained backend regression tests. Integration tests fail explicitly if `TEST_DATABASE_URL` is missing; they never silently fall back to the application's database. No database reset or migration is run by the tests.

- `display-name.test.cjs`: existing isolated auth/DTO coverage.
- `availability-stream.test.cjs`: SSE headers, event isolation, heartbeat and disconnect/error/backpressure cleanup. Uses fake responses and a controlled clock, with no database or real-time waits.
- `transaction-conflict.test.cjs`: query-time and adapter commit-time serialization errors both retry and end as 409 without publishing; unrelated database errors remain unchanged.
- `marketplace-invariants.test.cjs`: real PostgreSQL service/repository transactions covering rental capacity, owner blocks, protected listing edits, SALE inventory, and service-triggered availability events.
- `helpers/database.cjs`: unique fixture users/products, exact-ID cleanup, and a barrier that pauses the first reads of two real transactions so their snapshots overlap. Retries and database writes remain real. Cases in the integration file must remain sequential because the barrier temporarily wraps that process's Prisma transaction entry point.

Each integration run creates unique fixtures and notifications only for its test users. Teardown removes the fixture records and disconnects Prisma, including after assertion failures. Abrupt process termination can prevent teardown; use a disposable test database. The suite requires a normal PostgreSQL connection/pool supporting at least two simultaneous interactive transactions.

For just the database-free tests:

```powershell
node --test tests/display-name.test.cjs tests/availability-stream.test.cjs tests/transaction-conflict.test.cjs
```
