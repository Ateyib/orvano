# Orvano scope: Databases

Part of the [Orvano scope](index.md). The legend, workflow default, and build approach live there.

Project databases start with PostgreSQL. The SDKs speak an engine neutral language (tables, rows, filters, relations) so other engines can join a project later without changing app code; raw SQL is a Postgres only extra.

## Slice 1: Core loop

### 15. Project databases · needs a decision
Create a PostgreSQL database inside a project. Decides how one project's data is kept apart from every other project's, and the seam a second engine would plug into later.
**Done when:** creating a database in a project provisions isolated Postgres storage that no other project can reach, behind an engine seam a second engine could implement.
- [ ] Design it (spec): `/architect project databases`

### 16. Tables and rows API · needs a decision
Engine neutral create, read, update, and delete for rows in a table, through every SDK, enforcing the access control model. This closes the core loop.
**Done when:** a signed in user writes and reads their own row from the JavaScript and Flutter SDKs, the .NET, Dart, and JavaScript server SDKs read it with an API key, and other users are denied.
- [ ] Design it (spec): `/architect tables and rows API`

## Slice 3: Database breadth

### 55. Row import & export · needs a decision · from spec 0001
Bring rows into a table from CSV or JSON and take them out again, from the console and the server SDKs.
**Done when:** an import maps file columns to table columns, runs a dry run first, and reports every rejected row; an export downloads the filtered rows and chosen columns; large files run as a background job (spec 0001, UX-29).
- [ ] Design it (spec): `/architect row import & export`

### 24. Schema management · needs a decision
Columns and types, indexes, and relationships from the console and CLI, each change recorded as a migration, kept engine neutral.
**Done when:** an operator adds a column, an index, and a relationship; each change is recorded as a migration that applies cleanly to another install.
- [ ] Design it (spec): `/architect schema management`

### 25. Queries & relations · needs a decision
Filters, sorting, pagination, counts, field selection, and loading related rows, behaving the same in every SDK.
**Done when:** the conformance suite covers every query operator in all six SDKs, and limits stop any single query from overloading a project.
- [ ] Design it (spec): `/architect queries & relations`

### 26. Row permissions · needs a decision
Apply the access control model per table and per row, set from the console and SDKs.
**Done when:** table and row rules decide every read and write (realtime later honors the same rules), and denied access returns one consistent error.
- [ ] Design it (spec): `/architect row permissions`

### 27. SQL editor · needs a decision
A Postgres only console tool to run SQL against a project database and save queries, clearly marked as engine specific.
**Done when:** an operator runs a query and sees results, and it cannot reach other projects' data or Orvano's own records.
- [ ] Design it (spec): `/architect SQL editor`
