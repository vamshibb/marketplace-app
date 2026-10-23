# Payment Architecture

The marketplace payment domain provides the backend foundation for checkout, payment provider integration, webhooks, deposits, refunds, and payouts.

No real payment provider is configured yet. The backend must never treat frontend-reported success as authoritative payment state.

## Payment model

A Payment belongs to an Order and has one purpose:

- SALE
- RENT
- RENT_DEPOSIT

An Order can have more than one payment purpose when required, such as RENT and RENT_DEPOSIT.

Payment lifecycle states include:

- PENDING
- PROCESSING
- AUTHORIZED
- CAPTURED
- FAILED
- CANCELLED
- PARTIALLY_REFUNDED
- REFUNDED

Payment creation is protected by order/purpose uniqueness and idempotency.

Provider transactions are uniquely identified by:

provider + providerPaymentId

## Provider boundary

Payment providers are accessed through the PaymentProvider abstraction.

The backend currently has no real provider configured and does not include a production mock provider.

Provider operations include authorization, capture, cancellation, refund, status lookup, and webhook verification.

## Checkout

Checkout financial values must come from persisted backend data.

The frontend cannot choose:

- payment amount
- currency
- payment purpose
- payment status
- provider payment identity

Current checkout authorization is intentionally blocked because the Order model does not yet persist enough financial information:

- SALE has no persisted currency.
- RENT has no authoritative rental total/pricing contract and no persisted currency.

The backend does not invent a default currency or rental total.

RENT_DEPOSIT remains part of M4C.

## Webhooks

Provider adapters verify raw webhook requests and return a normalized verified event.

Raw webhook bodies and signatures are not stored.

Webhook events are durably deduplicated using:

provider + providerEventId

Webhook processing states are:

RECEIVED -> PROCESSING -> PROCESSED | IGNORED | FAILED

FAILED events may be retried.

Only one worker may claim an event for processing. Stale or out-of-order webhook events must never regress Payment state.

Retryable webhook failures return a retryable HTTP response instead of being acknowledged as successful.

## Deferred work

M4C:
- rental deposits

M4D:
- refunds and settlement
- seller payouts
- partial refund accounting

M4E:
- frontend checkout and payment status UX

The payment and order lifecycles remain separate until later milestones explicitly connect them.