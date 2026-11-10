# 02 · Architecture

## Overview

```
┌──────────────────────────┐        HTTP / JSON        ┌──────────────────────────┐
│  React frontend (Vite)   │  ───────────────────────► │  Node.js API (http)      │
│  src/                    │  ◄─────────────────────── │  server/index.ts         │
│  - App.tsx (shell, tabs) │                           │  - routing, JSON, errors │
│  - components/*Page.tsx  │                           └────────────┬─────────────┘
│  - api.ts (client)       │                                        │ calls
└──────────────────────────┘                           ┌────────────▼─────────────┐
                                                       │  LibraryService          │
                                                       │  server/db.ts            │
                                                       │  - business rules        │
                                                       │  - reports / queries     │
                                                       └────────────┬─────────────┘
                                                                    │ SQL
                                                       ┌────────────▼─────────────┐
                                                       │  SQLite (library.db)     │
                                                       │  books · members ·       │
                                                       │  transactions            │
                                                       └──────────────────────────┘
```

The system has three layers. Each layer talks only to the one below it.

| Layer | Responsibility | Files |
|---|---|---|
| Presentation | Show data, collect input, call the API | `src/` |
| Application / API | Map HTTP requests to service calls, map errors to status codes | `server/index.ts` |
| Domain & data | Business rules, transactions, SQL | `server/db.ts` |

## Data model

```
books                               members
─────                               ───────
id            PK                    id          PK
isbn          UNIQUE                name
title                               email       UNIQUE
author
category
copies_total      ≥ 0
copies_available  0 … copies_total
                                             transactions
                                             ────────────
                                             id           PK
           books.id ◄──────────────────────  book_id      FK
           members.id ◄────────────────────  member_id    FK
                                             issued_at
                                             due_date
                                             returned_at  NULL = still on loan
                                             fine
```

Constraints in the schema, not just in code:
- `CHECK (copies_available <= copies_total)` and non-negative counts.
- `UNIQUE` on ISBN and email.
- `FOREIGN KEY` from transactions to books and members. Enabled with `PRAGMA foreign_keys = ON`.
- Indexes on `transactions(returned_at)` (for open loans) and `books(title)` (for sorted search).

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/books?q=` | List or search books |
| POST | `/api/books` | Add a book |
| PUT | `/api/books/:id` | Edit a book or change total copies |
| DELETE | `/api/books/:id` | Delete a book with no loans and no history |
| GET | `/api/members` | List members |
| POST | `/api/members` | Register a member |
| GET | `/api/transactions?status=open\|returned\|all` | List transactions |
| POST | `/api/transactions` | Issue a book (`bookId`, `memberId`) |
| POST | `/api/transactions/:id/return` | Return a book |
| GET | `/api/reports?date=` | Generate the report |

Errors come back as `{ "error": "message" }` with an HTTP status: 400 for invalid input, 404 for a missing record, 409 for a conflict such as a duplicate ISBN or no stock.

## Key flows

### Issuing a book
1. Check the member exists and holds fewer than 3 books.
2. Open a database transaction (`BEGIN IMMEDIATE`) so no other write can interleave.
3. Check the book has a free copy, then decrement `copies_available`.
4. Insert the transaction row with the due date.
5. `COMMIT`. On any error, `ROLLBACK` and no state changes.

### Returning a book
1. Reject if already returned.
2. Compute days late from the due date and today. Fine = days late × rate.
3. In one database transaction, set `returned_at` and `fine`, and increment `copies_available`.

## Design decisions

| Decision | Reason |
|---|---|
| SQLite via Node's built-in `node:sqlite` | A real relational database with no install step or native dependency. |
| Plain `http` module, no framework | Fewer moving parts; the routing is small enough to read in full. |
| Business rules in one service class | Testable without a server or UI. Injected clock makes date tests deterministic. |
| Stored `copies_available` | Fast reads for the catalogue; kept consistent inside the same database transactions that change loans. |
| React + TypeScript with Vite | Typed components, fast dev server, and a standard structure for a growing UI. |
| Each page keeps its own state | Changing data does not remount pages, so search text and form input are preserved. |

## Folder structure

```
library-management/
├── docs/                    Planning, architecture, screenshots
├── server/
│   ├── db.ts                Schema, LibraryService (rules and queries)
│   ├── index.ts             HTTP API
│   └── tests/
│       └── library.test.ts  System validation tests
├── src/
│   ├── main.tsx             React entry point
│   ├── App.tsx              Shell, navigation, header summary
│   ├── api.ts               API client and shared types
│   ├── index.css            Tailwind directives and base styles
│   └── components/
│       ├── BooksPage.tsx                Book management and search
│       ├── IssuePage.tsx                Issue a book
│       ├── MembersTransactionsPage.tsx  Members list, register, transactions and return
│       └── ReportsPage.tsx              Reports
├── index.html               Vite entry point (the only HTML file; it only loads the React app)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Testing strategy

- **Unit and behaviour tests** in `server/tests/library.test.ts` (14 tests). They run against an in-memory database and a controlled clock, so date rules are checked exactly.
- **Coverage of rules**: stock limits, the 3-book limit, late fines, double return, duplicate ISBN and email, delete guards, search fields, and report totals.
- **Manual end-to-end check**: create a book and member, issue, search, return, and verify the report.
