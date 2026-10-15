# Payment Architecture (M4A)

This is the internal payment foundation for the marketplace backend. It is intentionally narrow and does not gate existing order flows or move real money yet.

## Purpose model

Each payment is associated with a specific buyer-side financial purpose for an order:

- SALE
- RENT
- RENT_DEPOSIT

A single order may hold multiple payment records when needed, such as a RENT order that includes both RENT and RENT_DEPOSIT. The business uniqueness rule is `orderId + purpose`.

## Status model

Payment status is lifecycle-oriented and deliberately separate from order status:

- PENDING
- PROCESSING
- AUTHORIZED
- CAPTURED
- FAILED
- CANCELLED
- PARTIALLY_REFUNDED
- REFUNDED

Status transitions are validated in the service layer and rejected with HTTP 409 when they are illegal. Terminal states for M4A are FAILED, CANCELLED, and REFUNDED.

## Provider boundary

The payment provider interface is intentionally provider-agnostic and minimal. It covers future authorization, capture, cancel/void, refund, and status lookup operations. No production provider is configured in M4A, and the default provider is intentionally unsupported so it throws instead of manufacturing fake success.

## Idempotency

Payments use a unique idempotency key, generated as `orderId:purpose` by default. Reuse of the same idempotency key for a conflicting financial operation is rejected. A duplicate order/purpose with the same immutable financial details is treated as an idempotent replay.

Payment creation idempotency and provider-operation idempotency are separate concerns. M4A keeps creation idempotency local to the payment record, while external provider operations can carry operation-specific keys such as `payment-key:authorize` or `payment-key:capture` when needed.

Explicit partial-refund amount and idempotency semantics are deferred to M4D. In M4A, `refundPayment()` is intentionally a full-refund operation only; `PARTIALLY_REFUNDED` remains in the status model for future reconciliation/webhook-driven workflows, but it is not accepted as the explicit result of this M4A refund method. This avoids pretending a single payment amount is partially refunded when there is no M4D partial-refund contract yet.

## Provider and reconciliation hardening

M4A does not expose these provider operations publicly. Real provider/webhook idempotency, reconciliation, and concurrency hardening remain part of M4B, where durable external-side operation semantics can be modeled without affecting the current order flow.

## Refunds and payouts

Payment represents buyer-side order obligations. Refunds are modeled as lifecycle actions against a payment. Seller payouts and settlement flows are deferred to a separate M4D model because they involve accounting and payout lifecycle semantics that differ from buyer-side payment obligations.

## Scope

M4A does not introduce public payment endpoints, does not integrate Stripe/PayPal or any real provider, and does not mutate order lifecycle behavior. It only defines the internal data and service boundary needed for later checkout, deposits, refunds, and payouts.
