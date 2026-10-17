# Orvano scope: Auth

Part of the [Orvano scope](index.md). The legend, workflow default, and build approach live there.

End user auth for the apps built on Orvano. MVP methods: email and password, magic link, email code, anonymous, and phone SMS. Social sign in, multi factor auth, and end user teams are deferred (see the index).

## Slice 1: Core loop

### 14. Email and password auth · needs a decision

End users of a project sign up, sign in, and sign out with email and password through the client SDKs, with sessions and tokens scoped to that project.
**Done when:** an app using the JavaScript and Flutter SDKs signs up and signs in a user, the session survives an app restart, sign out ends it, and every server SDK can verify a session.

- [ ] Design it (spec): `/architect email and password auth`

## Slice 2: Auth breadth

### 17. Email delivery & templates · needs a decision

Send auth emails through a mail provider each install configures, with per project sender details and templates that are translation ready. Messaging (feature 43) reuses this.
**Done when:** a project sets its sender and edits its templates, a test email arrives, and delivery failures show in the console.

- [ ] Design it (spec): `/architect email delivery & templates`

### 18. Magic link, email code, verify & reset · needs a decision

Passwordless sign in by magic link or one time email code, plus email verification and password reset.
**Done when:** each flow works end to end from the client SDKs, and every link and code expires and works only once.

- [ ] Design it (spec): `/architect magic link, email code, verify & reset`

### 19. Anonymous sessions · needs a decision

Guest sessions that let someone use an app right away, then upgrade to a real account without losing what they made.
**Done when:** an anonymous user writes rows, converts to an email account, and still owns those rows.

- [ ] Design it (spec): `/architect anonymous sessions`

### 20. Phone SMS sign in · needs a decision

Sign in with a phone number and an SMS code through an SMS provider each install configures. Messaging (feature 43) reuses this provider seam.
**Done when:** a user signs in with an SMS code; codes expire and are rate limited; the provider can be swapped by configuration alone.

- [ ] Design it (spec): `/architect phone SMS sign in`

### 22. End user management · needs a decision

Console screens to list, search, and view a project's users and sessions, block or delete them, and set labels used by permissions.
**Done when:** an operator finds a user, ends their sessions, blocks or deletes them, and the change takes effect at once in every SDK.

- [ ] Design it (spec): `/architect end user management`
