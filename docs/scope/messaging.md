# Orvano scope: Messaging

Part of the [Orvano scope](index.md). The legend, workflow default, and build approach live there.

Builds on the email and SMS provider seams from auth (features 17 and 20).

## Slice 8: Messaging

### 43. Email & SMS messaging · needs a decision
Send emails and SMS to end users, one at a time or to topics, right away or scheduled.
**Done when:** a server SDK sends an email to one user and an SMS to a topic, scheduled sends fire on time, and delivery status shows in the console.
- [ ] Design it (spec): `/architect email & SMS messaging`

### 44. Push notifications · needs a decision
Register devices as targets and send push messages to users and topics on iOS, Android, and the web.
**Done when:** a Flutter app registers a device and receives a push sent from the console and from a server SDK.
- [ ] Design it (spec): `/architect push notifications`
