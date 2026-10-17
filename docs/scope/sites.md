# Orvano scope: Sites

Part of the [Orvano scope](index.md). The legend, workflow default, and build approach live there.

## Slice 7: Sites

### 40. Static sites · needs a decision

Host static web apps per project, deployed from the CLI, with a preview URL for each deployment.
**Done when:** a developer deploys a Vite build, gets a URL, and can roll back to an earlier deployment.

- [ ] Design it (spec): `/architect static sites`

### 41. Server rendered sites · needs a decision

Host server rendered apps, Next.js first, on top of the functions runtime.
**Done when:** a Next.js app using the Orvano Next.js SDK deploys and renders signed in pages on the server.

- [ ] Design it (spec): `/architect server rendered sites`

### 42. Custom domains & certificates · needs a decision

Attach your own domains to sites, functions, and the API, with HTTPS certificates issued and renewed automatically.
**Done when:** an operator adds a domain, verifies it, and gets HTTPS automatically, with renewal before expiry.

- [ ] Design it (spec): `/architect custom domains & certificates`
