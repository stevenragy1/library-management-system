# 01 · Project Planning

## Goal
A Library Management System that lets staff manage books, issue and return them to members, search the catalogue, and generate reports.

## Scope

| In scope | Out of scope (for this version) |
|---|---|
| Book catalogue (add, edit, delete, copies) | Online member accounts / login |
| Member registration | Payments and online fines |
| Issue and return with due dates and fines | Reservations / waitlists |
| Search by title, author, ISBN, category | Barcode scanning |
| Reports (stock, loans, overdue, popular, categories) | Multi-branch support |

## Workflow (from the brief)

| Step | Deliverable | Where it lives |
|---|---|---|
| 1. Book management modules | Book CRUD UI and API | `src/components/BooksPage.tsx`, `server/index.ts` |
| 2. Issue and return | Circulation rules and UI | `server/db.ts` (`issueBook`, `returnBook`), `CirculationPage.tsx` |
| 3. Store records in a database | SQLite schema with constraints and indexes | `server/db.ts` (`openDatabase`) |
| 4. Generate reports | Report queries and print view | `LibraryService.reports()`, `ReportsPage.tsx` |
| 5. Validate system operations | Automated test suite (14 tests) | `server/tests/library.test.ts` |

## Business rules

- A book has a fixed number of **copies**. `copies_available` is always between 0 and `copies_total`.
- A loan lasts **14 days**. The due date is the issue date plus 14.
- Returning late costs **1 unit of currency per day** overdue.
- A member can hold at most **3 books** at once.
- A book cannot be issued when no copies are available.
- A book cannot be returned twice.
- Copies on loan cannot be removed from the total, and a book with loan history cannot be deleted. This keeps the records consistent.

## Key features

1. **Book management**: add, edit, delete, adjust copies.
2. **Issue and return**: select a book and a member, then issue. Return from the transaction list.
3. **Search**: live search across title, author, ISBN and category.
4. **Reports**: summary totals, overdue list, most borrowed, and collection by category. Printable.

## Skills you will practise

| Skill | Where to look |
|---|---|
| Database integration | `server/db.ts`: schema, foreign keys, transactions (`BEGIN IMMEDIATE`/`COMMIT`/`ROLLBACK`), parameterised queries |
| Software architecture | `docs/02-architecture.md`: layers and how they communicate |
| Data processing | `LibraryService.reports()`: aggregation, `GROUP BY`, joins, date arithmetic |
| System testing | `server/tests/library.test.ts`: unit and behaviour tests of the business rules |

## Fundamentals to learn along the way

- **Relational data**: books, members and transactions are separate tables linked by IDs (foreign keys).
- **Atomicity**: issuing a book updates stock and creates a transaction. Both must succeed or neither should. That is the reason for the transaction blocks.
- **Validation in two places**: the UI gives quick feedback; the service layer is the real authority, because the UI can be bypassed.
- **Separation of concerns**: business rules live in `LibraryService`, not in React components or HTTP handlers. That makes them testable without a browser or a server.
- **Derived data**: `copies_available` could be recomputed from transactions. It is stored for speed, and the service keeps it correct.

## Milestones

1. Schema and business rules, with tests passing.
2. REST API over the service layer.
3. React UI for each feature.
4. Manual checks in the browser, then screenshots for these docs.
