# Orvano scope: Functions

Part of the [Orvano scope](index.md). The legend, workflow default, and build approach live there.

Running other people's code is the riskiest thing Orvano does. Feature 37 leans hard on the security baseline (feature 5).

## Slice 6: Functions

### 37. Function runtimes & deployments · needs a decision
Run user code in isolated sandboxes for a chosen set of languages, with builds, deployments, and rollback from the console and CLI.
**Done when:** a developer deploys a function from the CLI, it builds and runs isolated from other projects and from the host, build logs show in the console, and they can roll back.
- [ ] Design it (spec): `/architect function runtimes & deployments`

### 38. Function triggers · needs a decision
Run functions from an HTTP call, a platform event, or a schedule, with the caller's identity when there is one.
**Done when:** one function runs from an HTTP call, an event, and a schedule, and knows which user (if any) triggered it.
- [ ] Design it (spec): `/architect function triggers`

### 39. Function variables & secrets · needs a decision
Per function and per project variables, with secrets encrypted at rest and hidden after saving.
**Done when:** a function reads its variables at run time, and secrets never appear in the console or in logs after they are saved.
- [ ] Design it (spec): `/architect function variables & secrets`
