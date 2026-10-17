# Orvano scope: Realtime & events

Part of the [Orvano scope](index.md). The legend, workflow default, and build approach live there.

## Slice 5: Realtime and events

### 33. Platform events · needs a decision

One internal event stream for every change (row written, file uploaded, user created) that realtime, webhooks, and functions all read.
**Done when:** every service emits typed events of one consistent shape, consumers receive them reliably, and the event list is part of the API contract.

- [ ] Design it (spec): `/architect platform events`

### 34. Database change subscriptions · needs a decision

Clients subscribe to table or row changes and receive only what their permissions allow.
**Done when:** Flutter and JavaScript clients see inserts, updates, and deletes live, reconnect after network loss, and never receive a row they cannot read.

- [ ] Design it (spec): `/architect database change subscriptions`

### 35. Broadcast & presence · needs a decision

Channels for sending messages between clients and seeing who is online.
**Done when:** two clients in a channel exchange messages and see each other join and leave.

- [ ] Design it (spec): `/architect broadcast & presence`

### 36. Webhooks · needs a decision

Project owners register URLs for chosen events and receive signed deliveries with retries and history.
**Done when:** a webhook receives a signed payload for a chosen event, failed deliveries retry with backoff, and delivery history shows in the console.

- [ ] Design it (spec): `/architect webhooks`
