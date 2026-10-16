# 0001. Console UX patterns: rationale

The decision record for [index.md](index.md). `/develop` doesn't need this file. It's for people, and for `/architect` when the standard changes.

## Context

> ⚠️ Premise note: this spec covers behavior and layout only. The look (tokens, type, color, themes) and the component library choice belong to feature 11, and the React code conventions belong to feature 2. Keeping them apart stops one spec from making three decisions. It does mean feature 11 has to deliver every primitive this spec lists before console screens can fully meet it.

Orvano's console is where developers spend most of their time with the product: creating tables, editing rows, uploading files, deploying functions, and checking logs. A backend as a service is judged on this surface next to Appwrite and Supabase, and both have spent years refining theirs. Developers moving from either will expect what they already know: the table list stays visible, cells can be edited inline, and Cmd+K works.

The console spans many services (auth, databases, storage, realtime, functions, sites, messaging, operations), and every one is built slice by slice under a Tracer Bullet approach, mostly by one person working with AI agents. Without one standard, each slice would invent its own layout, form surface, delete dialog, and loading treatment, and the console would drift the way large admin tools often do. The rules have to be easy to follow by default, because no one will reread a long document before every screen.

The console must meet WCAG 2.2 AA and keep every string translation ready (both set in the scope). Data heavy screens are where accessibility usually fails: grids, drag interactions, toasts, and sticky bars that hide focus.

## Options considered

The pattern choices were made one at a time in the design conversation (see *Pattern choices* below). The options here are about how the standard is enforced.

### Option 1: Shared primitives plus lint and automated accessibility checks
Write the rules, build them into design system primitives, block building around them with a lint rule, and run automated accessibility checks in CI.

**Pros**: the rules hold without anyone remembering them. Violations fail CI, not review. Every new screen is mostly composition.
**Cons**: more design system work up front. The lint rules need maintenance. Some rules (which surface, which delete tier) still rely on review.

### Option 2: Document, then rely on review
Write the rules and check them in code review and `/check verify` only.

**Pros**: no tooling to build, fastest to start.
**Cons**: one developer reviewing their own AI built screens will miss drift. Accessibility regressions slip in silently.

### Option 3: Adopt one public design system's patterns wholesale
Follow a published system (Carbon, Atlassian, Primer, or similar) for every pattern, and its components too.

**Pros**: the patterns are already documented and tested, and accessibility is mostly handled.
**Cons**: none of them are built for a BaaS console (resource lists, SDK snippets, spreadsheet grids), so Orvano would still need its own rules. It also locks in that system's look and tooling, which is feature 11's decision.

## Rationale

Option 1 fits the forces here. A single builder with agents gets the most from rules that live in code: an agent composing `ResourceLayout` or `ConfirmDelete` can't get UX-2 or UX-23 wrong, and CI catches the rest. Option 2 is too weak for a GA tier product that must meet WCAG 2.2 AA. Option 3 still leaves the BaaS specific patterns unsolved, and it makes the visual and tooling decision early. The research (below) showed that the guidance from public design systems agrees on most rules. So Orvano can borrow those rules (APG for grids, dialogs, and tabs; NN/g and GOV.UK for form errors; Carbon for messages and loading) without adopting any one system. (basis: shared primitives over written guidelines for consistency; WAI ARIA Authoring Practices)

## Pattern choices

What you chose, and the main alternative turned down, one line each.

| Rule | Chosen | Turned down, and why |
|---|---|---|
| UX-1 | Two level sidebar plus top bar | Icon only rail (harder to learn); top tabs for services (runs out of room as services grow) |
| UX-2 | Resource list visible, collapsible, resizable, searchable | Fixed width (cuts long names, can't make room for wide grids) |
| UX-3 | Desktop first, sidebars become drawers below 1024 px | Fully responsive (a lot of work for the grid); desktop only (can't check from a phone) |
| UX-4 | Switchers in the breadcrumbs | Picker at the top of the sidebar (splits "where am I" across two places) |
| UX-5 | Tabs as URL routes | ARIA tabs with no URL (refresh loses the tab, can't link to it) |
| UX-6 | Side sheet by default, full page for long flows, modal for confirms | Modals for every create (hides context, cramped); full page for everything (slow for small edits) |
| UX-9 | Each settings card saves itself | One sticky save bar (one bad field blocks the whole save); autosave (half typed values take effect) |
| UX-8 | Check on leaving a field, plus a summary on submit | Submit only (mistakes found late); live while typing (NN/g advises against) |
| UX-12 | Inline cells plus row side sheet | Side sheet only (Appwrite moved away from it); inline only (awkward for JSON and relations) |
| UX-12 | Save each change on commit, with undo | Queue changes, then save all (easy to leave with unsaved edits) |
| UX-14 | Cursor based Previous and Next | Numbered pages (needs exact counts, slow on some engines); infinite scroll (loses your place, guidance warns against it) |
| UX-15 to 18 | Filter builder, header sort, column management, bulk actions, keyboard and clipboard | (all chosen) |
| UX-20 | One action plus an SDK quick start | Action only (misses the chance to teach the SDKs) |
| UX-21 | Skeletons, timed by response limits | Spinners everywhere (layout jumps) |
| UX-23 | Tiers by blast radius; single row delete is a quick confirm you can skip for the session | Always type to confirm (people learn to click through); confirm only (too light for deleting a project); undo by recreating the row (dropped after the cross check, see below); a server side undo window (needs a pending delete state across the rows API and realtime) |
| UX-24 | Toasts, inline, and banners, each with a job | Toasts for everything (errors far from where they happened) |
| UX-25 | Command palette with navigation and actions | Navigation only; later |
| UX-27 | Everything shareable in the URL | Location and tab only (filtered views can't be linked) |
| UX-28 | Preferences in the browser for now | On the server per user (needs an API now) |
| UX-29 | Status in place plus a live log panel | Status only (can't watch a build fail as it happens) |
| UX-19 | Live updates that never move rows under your cursor | Manual refresh only (feels stale next to the competition) |
| UX-30 | Hide areas, disable actions with a reason | Hide everything (features become invisible); show all, error on use (frustrating) |
| UX-31 | Docs side pane, in the same place on every page | Open docs in a new tab (you leave your work) |
| UX-32 | Comfortable default, compact toggle | Compact only (harder to scan and tap) |

Decided by `/architect`, not asked (with the runner up):
- **Tables and columns stay at Tier 2.** The cross check suggested Tier 1 for dropping a column, but you put tables at Tier 2, and a column can't need more friction than its whole table. Both dialogs state how many rows are affected instead. The runner up was moving both to Tier 1.
- **Skeletons appear after 300 ms** so a fast response doesn't flash a skeleton. The runner up was showing one at once.
- **Filters are joined with AND only at first**, because OR groups double the builder's complexity. The runner up was nested AND and OR groups.
- **Toasts go bottom right, and success toasts close after 6 s** so they stay clear of the top bar and breadcrumbs. The runner up was top right, as Carbon does.
- **The submit button is never disabled for invalid fields**, because pressing it reveals the errors. The runner up was disabling it until the form is valid, which hides why.
- **Disabled actions use `aria-disabled`** so a keyboard user can still reach the hint saying why. The runner up was the native `disabled` attribute, which can't take focus.

## Cross check

A read only review on a second model (2026-10-15) found about 30 gaps where builders would have had to invent behavior, several rules that contradicted each other, and patterns that were missing. You chose to apply the recommended fixes. What changed:

- **Contradictions resolved**: the row sheet is the one non modal sheet and has its own Save (UX-6, UX-13); errors are inline when their source is on screen and a persistent toast otherwise (UX-12, UX-24); only path changes move focus (UX-35); settings sections are page tabs, not a third navigation level (UX-1).
- **Single row undo dropped**: recreating a row fires delete and create triggers and webhooks, breaks identity columns and sequences, and puts two events in realtime and audit logs. You replaced it with a quick confirm you can skip for the session (UX-23).
- **Sources named**: dependents counts, row versions, both cursors, request IDs, required roles, allowed actions, the palette search, and the active jobs list now each name the API piece that provides them (follow ups to features 10, 16, 25, 46).
- **Exact values set**: the sheet versus page limit, paste and bulk limits, sort ties, filter URL format and rule cap, history push versus replace, preference keys, log buffer, row heights, the time display cutoff, and toast queueing.
- **Rules added**: insert row (UX-38), motion and contrast (UX-39), tooltips (UX-40), one announcer (UX-41), session expiry and retry policy (UX-22), request cancelling (UX-21), reflow at zoom (UX-3), right to left layout and plural forms (UX-34), message history (UX-24).
- **Enforcement tightened**: the lint check on role strings was dropped (component libraries set roles internally, so it would be noisy and easy to dodge). The import restriction stays, a concrete literal string rule was added, and a scripted screen reader test was added, because automated checks catch only part of WCAG.
- **Kept out of this standard**: screen patterns specific to one service (file browser, permissions editor, logs, charts, schema changes, function runner, variables editor, onboarding) belong to those features' own specs. Row import and export became scope feature 55.

## Research evidence

Two read only research passes ran on 2026-10-15. **[V]** means read on a fetched page. **[S]** means seen only in a search result and not verified. **[I]** means inferred.

### Appwrite
- [V] The TablesDB UI (August 2025) renamed collections, documents, and attributes to tables, rows, and columns. It uses one spreadsheet style view: cells edited inline (the old view was read only), columns reordered by drag and drop, arrow key navigation, copy and paste, undo and redo, and several rows selected at once for bulk delete or update.
- [S] A row side sheet with up and down chevrons to move between rows, which are hidden on tablet widths.
- [V] Console IV (August 2026) merges the website, docs, and console into one app. Docs open in a right side pane that keeps its own breadcrumb, so forms stay put. It adds a scoped Cmd+K Command Center, a CLI terminal in the browser (Cmd+;), and an Explorer that sends live API calls from the OpenAPI spec. It's built on ShadCN and Radix with TanStack (relevant to feature 11 and 2, not decided here).
- [V] Appwrite's older Pink design system is archived. [I] The console no longer uses it.
- Not verified from public pages: the exact behavior of the table list sidebar, detail tabs, paging, filters, settings saving, and delete confirmations. UX-2 rests on your stated requirement and general list and detail practice, not on a verified Appwrite source.

### Supabase Studio
- [V] Table Editor, SQL Editor, and Row Level Security can be toggled from the editor.
- [V] Studio 2.0: a row side panel, inline cell editing, JSON cells open in the panel, a foreign key picker with "View referencing", and a cascade delete option shown at delete time. It also shows SQL definitions and generated API docs with SQL and JS snippets.
- [V] May 2025: tabs in the Table Editor and SQL Editor (feature preview), sort moved into the column header menu, and export with all rows selected.
- [V] The Supabase design system separates a static Table, a Data Table (sort, Previous and Next paging, column visibility, text filter, selection with a footer count, a "No results" row), and a Data Grid (virtualized rows, resizable columns, spreadsheet editing, range selection).
- [S] An operation queue that saves batched edits with Mod+S.

### Others
- [V] Convex: a function list on the left, a runner with an argument form and live results, "act as a user", and charts per function. [S] Realtime logs filterable by function and status.
- [V] Firebase Firestore: Data, Rules, Indexes, and Usage tabs; drill in navigation by path; a query builder.

### Guidance by topic
- **Navigation**: [S] GitLab Pajamas, citing NN/g, allows two levels and no third, with stable top level items. [S] NN/g: vertical navigation suits wide information sets that keep growing, and shallow beats deep.
- **Tabs**: [V] The APG tabs pattern makes the tab list one tab stop with arrow keys, and uses manual activation when panels take time to load. APG doesn't cover tabs as routes. [I] Use links with `aria-current` when each view has its own URL.
- **Forms**: [V] NN/g says to validate when the user leaves a field, not while typing, and to put messages next to fields that are explicit, polite, and pair color with an icon. [V] GOV.UK says to show an error summary whenever validation fails, at the top, linking to each field, with focus moved to it and the same wording as the inline message.
- **Grids**: [V] The APG grid pattern: use `role="grid"` only when cells are interactive. It sets the full key model used in UX-11 (one tab stop, arrows, Home and End, Ctrl+Home and Ctrl+End, Page Up and Page Down, Enter or F2 to edit, Escape to leave). [S] Carbon: a batch action bar while rows are selected, row actions disabled during it, a three state sort icon, and paging at the bottom.
- **Loading**: [V] NN/g response limits: 0.1 s feels instant, after 1 s show that work is happening, after 10 s show progress and a way to cancel. [S] Carbon: skeletons for containers and data, not for buttons, inputs, or toasts.
- **Empty states**: [S] Carbon names three kinds (first use, the result of an action, error), each with one primary action, and an empty table drops its headers.
- **Destructive actions**: [S] NN/g says to confirm only rare, severe actions, prefer undo where possible, use specific button labels, and save typing the name for the most dangerous cases.
- **Messages**: [V] Carbon: inline messages sit near the item and suit task errors; toasts are for system messages and may close on their own only if they have no actions; critical messages never close on a timer; banners show one at a time. [V] WCAG 4.1.3: status messages use `role="status"` (or `alert` for errors) and never move focus.
- **Dialogs**: [V] The APG modal dialog pattern: the dialog is named by its title, focus is trapped, Escape closes, focus returns to the opener, and focus starts on the least destructive option for irreversible actions.
- **Palette and shortcuts**: [S] Primer: the palette is a dialog that focuses its input. Shortcuts are additive, single key shortcuts must be possible to disable or work only while their component has focus, and they're declared with `aria-keyshortcuts`.
- **WCAG 2.2**: [V] 2.5.8 sets targets of at least 24 by 24 px. [V] 2.4.11 says focus must never be fully hidden by sticky bars, toasts, or non modal drawers. [V] 2.5.7 says every drag needs a way to do it with a single pointer. [S] 3.2.6 asks for consistent help, 3.3.7 for no redundant entry, and 3.3.8 for accessible authentication.

## References

**Project sources**:
- Scope [index.md](../../scope/index.md) (WCAG 2.2 AA, translation ready, Tracer Bullet, GA tier) and feature 54 in [foundations.md](../../scope/foundations.md)
- Your stated requirement: the table list stays visible while a table is open (Appwrite style)

**Practices & standards**:
- WAI ARIA Authoring Practices: tabs, modal dialog, grid, combobox and listbox
- WCAG 2.2: 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8, 4.1.3
- NN/g response time limits and form error guidelines
- GOV.UK error summary pattern
- Carbon notification, loading, and empty state patterns
- Shared primitives over written guidelines for consistency

**Links** (fetched and verified during research):
- Appwrite, Announcing an improved Appwrite Databases experience: https://appwrite.io/blog/post/announcing-appwrite-databases-new-ui
- Appwrite changelog, Announcing new TablesDB UI: https://appwrite.io/changelog/entry/2025-08-26-1
- Appwrite, Announcing Console IV: https://appwrite.io/blog/post/announcing-console-iv
- Appwrite, Appwrite 1.8.0 self hosted release: https://appwrite.io/blog/post/appwrite-1-8-0-self-hosted-release
- Supabase, Supabase Studio 2.0: https://supabase.com/blog/supabase-studio-2.0
- Supabase changelog, Dashboard updates (April to May 2025): https://supabase.com/changelog/35495-dashboard-updates-210425-050525
- Supabase design system, Tables pattern: https://supabase.com/design-system/docs/ui-patterns/tables
- Convex docs, Functions dashboard: https://docs.convex.dev/dashboard/deployments/functions
- Firebase, Manage Cloud Firestore with the console: https://firebase.google.com/docs/firestore/using-console
- WAI ARIA APG, Tabs pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- WAI ARIA APG, Dialog (modal) pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- WAI ARIA APG, Grid pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- WCAG 2.2 Understanding, Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- WCAG 2.2 Understanding, Focus Not Obscured (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- WCAG 2.2 Understanding, Dragging Movements: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- WCAG 2.2 Understanding, Status Messages: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- NN/g, Response Times: The 3 Important Limits: https://www.nngroup.com/articles/response-times-3-important-limits/
- NN/g, Errors in Forms Design Guidelines: https://www.nngroup.com/articles/errors-forms-design-guidelines/
- GOV.UK Design System, Error summary: https://design-system.service.gov.uk/components/error-summary/
- Carbon Design System, Notification pattern: https://carbondesignsystem.com/patterns/notification-pattern/
