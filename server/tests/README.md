# Backend regression tests

Uses the existing Node `node:test` runner, strict assertions, and `ts-node/register/transpile-only`. No extra test dependency is required.

## Retained payment coverage

Focused payment verification is kept in the final checkout/webhook regression file.

```powershell
cd server
node --test tests/payment-checkout-webhook.test.cjs
```

The checkout/webhook tests intentionally cover:

- server-authoritative checkout behavior without caller-controlled financial inputs
- SALE and RENT authorization failing cleanly when the persisted financial contract is missing
- canonical provider identity and raw-body verification in the webhook boundary
- retryable versus permanent webhook outcomes and durable event lifecycle semantics
- safe no-op processing for same-status webhook events and stale/out-of-order rejections

## Existing retained tests

- `payment-domain.test.cjs`: payment record constraints, status transitions, provider identity checks, and M4A safety invariants.
- `payment-checkout-webhook.test.cjs`: final checkout and webhook boundary regression coverage for the M4B correction pass.

For database-backed integration tests, continue to use a dedicated PostgreSQL test database and the existing `TEST_DATABASE_URL` pattern. Do not run the full backend suite unless the environment is specifically prepared for it.
