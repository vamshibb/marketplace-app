# Authenticated realtime events (M3A)

`GET /api/realtime/stream` opens a user-scoped SSE response after the existing
JWT middleware authenticates `Authorization: Bearer <token>`. Identity comes
only from the verified JWT (`req.user.id`), never from a route/query user ID.
Missing/invalid/expired credentials or missing user identity return HTTP 401
before any SSE headers are sent. Query parameters and cookies are not used for
authentication. Never put tokens in stream URLs or log authorization headers.

Use authenticated `fetch` and read `response.body` as a stream; native
`EventSource` cannot set this Authorization header. This endpoint uses the same
CORS policy as the existing REST API. Frontend integration is a later milestone.

```typescript
const response = await fetch(`${apiBaseUrl}/realtime/stream`, {
  headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
  signal: abortController.signal,
});
// Check response.ok before reading. Parse SSE across arbitrary chunk boundaries.
// Abort on logout/account change; reconnect with the current bearer token.
```

The initial frame is `retry: 5000`, `event: connected`, `data: {"version":1}`.
Keepalive frames are SSE comments (`: heartbeat`) every 25 seconds. Fetch clients
must implement reconnection/backoff themselves; the retry field is advisory.
Responses disable caching and proxy buffering. JWT validation occurs when the
connection opens; this milestone does not introduce token revocation or session
expiry timers for existing connections. Reconnection authenticates again.

## Event contract

Each event uses its named SSE `event` field and a JSON `data` object:

| Event | Data | Recipients |
| --- | --- | --- |
| `message_created` | `{ conversationId, messageId, senderId }` | All conversation participants, including the sender's other tabs/devices |
| `conversation_read_changed` | `{ conversationId, userId, lastReadMessageId }` | All conversation participants; cursor is the committed result, not the requested message ID |
| `notification_created` | `{ notificationId }` | Notification recipient only |
| `notification_read_changed` | `{ scope: "notification", notificationId }` | Recipient whose single notification was marked read |
| `notification_read_changed` | `{ scope: "all" }` | Recipient whose mark-all action changed notifications |
| `notification_read_changed` | `{ scope: "conversation", conversationId }` | Reader whose conversation acknowledgment also changed message notifications |

IDs are strings; `lastReadMessageId` is a string or null. No message content,
notification body, email, or JWT is included. Events are query-invalidation
signals, not an authoritative snapshot. A created notification may already be
read if its delayed creation followed a conversation acknowledgment. Repeated
cursor acknowledgments can produce another read-change signal; consumers should
refetch rather than assume every event represents a forward cursor advance.

Publish points follow successful repository operations/transaction commits.
The first message in a newly created or reused conversation emits the same
`message_created` event as the existing send-message action. Central notification
creation covers messages, orders, rental transitions and reviews. Read changes
that update no notifications emit no notification event. Existing REST business
rules and response shapes remain unchanged.

## Delivery and lifecycle

The shared `scopedSsePublisher` manages connection sets, one unref'ed heartbeat
timer per connection, and cleanup. Availability SSE retains its existing public
product-scoped contract; authenticated realtime uses a separate publisher/map.
One user can have multiple connections. A response cannot be rebound to another
scope while subscribed.

Response close/finish/error, request abort/error, or explicit unsubscribe removes
the connection, timer, listeners, and empty user group. Request `close` alone
is intentionally ignored because it can mean GET parsing finished. Failed
headers/writes, ended responses, and `write()` backpressure disconnect the
client; the server does not accumulate an application event queue. Broken socket
cleanup and serialization failures cannot interrupt healthy subscribers or
turn a committed domain mutation into a failure.

Delivery is **process-local and best effort**: no durable outbox, event IDs,
history, replay, or `Last-Event-ID` support. Events can be missed during startup,
disconnect, restart, or a crash after database commit. Consumers must refetch
messaging/notification state after `connected` and reconnect. Refetching also
handles duplicates and concurrent mutation ordering.

**Multi-instance deployment requires shared Redis/Postgres pub-sub or equivalent**
before realtime delivery can reach users connected to a different Node process.
This milestone does not implement that transport or durable delivery.
