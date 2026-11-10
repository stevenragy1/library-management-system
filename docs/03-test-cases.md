# 03 · Test Cases

This document lists every test case for the Library Management System. Each case has an ID, the feature it covers, the steps, the expected result, and a status.

**Status key**
- **Pass (automated):** run by `npm test`, all 14 passing.
- **Pass (API):** run against the live API over HTTP during the build.
- **Manual:** written as browser steps. To be run by hand in VS Code and recorded here.

---

## 1. Automated tests (`npm test`)

File: `server/tests/library.test.ts`. Each test uses a fresh in-memory database and a fixed clock.

| ID | Group | Test | What it checks | Status |
|---|---|---|---|---|
| A-01 | Books | adds a book with all copies available | New book has `copies_available = copies_total`, default category "General" | Pass |
| A-02 | Books | rejects duplicate ISBN | Second book with the same ISBN raises "already exists" | Pass |
| A-03 | Books | rejects missing fields and invalid copy counts | Empty ISBN and copies = 0 are rejected | Pass |
| A-04 | Books | cannot reduce copies below the number on loan | Lowering total below the loaned count fails; a valid lower value updates available correctly | Pass |
| A-05 | Books | search matches title, author, ISBN and category | Each search field returns the right book; no match returns none | Pass |
| A-06 | Books | cannot delete a book on loan or with history | Delete is blocked while on loan, and after return while it has history | Pass |
| A-07 | Issue & return | issuing decrements stock and sets a due date | Stock drops by 1; issue date 2026-01-01, due date 2026-01-15 (14 days) | Pass |
| A-08 | Issue & return | cannot issue when no copies are left | Second issue of a 1-copy book fails with "No copies" | Pass |
| A-09 | Issue & return | a member cannot hold more than 3 books | Three loans succeed; the fourth fails with "3 books" | Pass |
| A-10 | Issue & return | returning on time restores stock with no fine | Return on day 9 gives fine 0 and restores stock | Pass |
| A-11 | Issue & return | late return charges a fine per day overdue | Return 5 days after due date gives fine 5 | Pass |
| A-12 | Issue & return | a book cannot be returned twice | Second return fails; stock is not counted twice | Pass |
| A-13 | Members | validates email and enforces uniqueness | Invalid email rejected; duplicate email (any case) rejected | Pass |
| A-14 | Reports | summarises stock, loans, overdue items and popularity | Totals, on-loan count, overdue list, most-borrowed order and category groups are correct | Pass |

Run result: `# tests 14`, `# pass 14`, `# fail 0`.

---

## 2. API tests (HTTP, against the running server)

Run with the server on port 4100 and a temporary database. All returned the expected result.

| ID | Request | Expected | Status |
|---|---|---|---|
| API-01 | `POST /api/books` with ISBN 978-1, Dune, 2 copies | 200, `copies_available: 2` | Pass (API) |
| API-02 | `POST /api/members` with Sara, sara@example.com | 200, member created | Pass (API) |
| API-03 | `POST /api/transactions` with bookId 1, memberId 1 | 200, due date 14 days after issue | Pass (API) |
| API-04 | `GET /api/books?q=herbert` | 200, Dune listed with `copies_available: 1` | Pass (API) |
| API-05 | `POST /api/transactions/1/return` | 200, `returned_at` set, fine 0 | Pass (API) |
| API-06 | `POST /api/transactions/1/return` again | 409, "already been returned" | Pass (API) |
| API-07 | `GET /api/reports` | 200, totals and popular list correct | Pass (API) |
| API-08 | `GET /api/nope` | 404 | Pass (API) |

---

## 3. Manual UI tests (browser)

Start with `npm run dev` and open http://localhost:5173. Record the result in the last column once run.

### Books tab

| ID | Steps | Expected result | Status |
|---|---|---|---|
| UI-01 | Enter ISBN `978-1`, Title `Dune`, Author `Frank Herbert`, Category `Sci-Fi`, Copies `2`; click **Add** | Book appears in table as `2 / 2` | Manual |
| UI-02 | Add a book with the same ISBN again | Red error: "A book with this ISBN already exists" | Manual |
| UI-03 | Type `herbert` in search | Only Dune is shown | Manual |
| UI-04 | Type `zzz` in search | "No books found." | Manual |
| UI-05 | Clear the search | All books shown again | Manual |
| UI-06 | Click a category pill (e.g. Sci-Fi) | Only books in that category shown | Manual |
| UI-07 | Click **+** on Dune | Shows `3 / 3` | Manual |
| UI-08 | Click **−** on Dune (with none on loan) | Shows `2 / 2` | Manual |
| UI-09 | Issue a copy, then check the **−** button | **−** is disabled when no copy is free | Manual |
| UI-10 | Click **Delete** on a book with no loans and no history | Confirm prompt; book removed | Manual |
| UI-11 | Click **Delete** on a book on loan | Error: "on loan" | Manual |
| UI-12 | Hover the **Add** button | Background changes from red to blue | Manual |

### Issue tab

| ID | Steps | Expected result | Status |
|---|---|---|---|
| UI-13 | Open the tab with nothing selected | **Issue book** button is disabled | Manual |
| UI-14 | Select a book only | Button still disabled; book info line shows author, category and copies available | Manual |
| UI-15 | Select a book and a member, click **Issue book** | Success overlay: "Dune issued to Sara. Return due by <date 14 days ahead>." | Manual |
| UI-16 | Click **Issue Another Book** | Overlay closes; dropdowns are cleared | Manual |
| UI-17 | Open the Book dropdown | Books with 0 copies are disabled and marked "Currently unavailable" | Manual |

### Members & Transactions tab

| ID | Steps | Expected result | Status |
|---|---|---|---|
| UI-18 | Enter a name and email, click **Add member** | Green message "Patron added to the registry." | Manual |
| UI-19 | Register the same email again | Red error: "A member with this email already exists" | Manual |
| UI-20 | Check the metric cards | On loan, Overdue and Fines match the Reports tab | Manual |
| UI-21 | Issue a book, then click **Return** on it | Green message; status shows "Returned <date>"; metric cards update | Manual |
| UI-22 | Change the filter to **Overdue** | Only unreturned loans past their due date are shown | Manual |
| UI-23 | Change the filter to **Returned** | Only returned loans shown | Manual |
| UI-24 | Late return: set a loan's `due_date` to a past date in `library.db`, then return it | Status shows "Returned <date> · fine $N" with N = days late | Manual |
| UI-25 | Issue a fourth book to the same member | Red error: "Member already has 3 books on loan" | Manual |

### Reports tab

| ID | Steps | Expected result | Status |
|---|---|---|---|
| UI-26 | Open the tab | Seven stat cards: Titles, Copies, Available, On loan, Members, Overdue, Fines ($) | Manual |
| UI-27 | Compare with the actions done so far | Numbers match the books, members and loans in the database | Manual |
| UI-28 | Check the **Overdue books** table | Lists each overdue loan with book, member and due date | Manual |
| UI-29 | Check the **Most borrowed** table | Titles sorted by loan count, top 5 | Manual |
| UI-30 | Check the **Collection by category** table | One row per category with titles and copies | Manual |
| UI-31 | Click **Print / save as PDF** | Print dialog opens; navigation and buttons are hidden in print preview | Manual |
| UI-32 | Hover **Print / save as PDF** | Button changes from red to blue | Manual |

---

## 4. How to record results

1. Run `npm test` and confirm 14 passing.
2. Work through section 3 in order. Replace `Manual` with `Pass` or `Fail` in the Status column.
3. For any failure, note the exact step, what you saw, and the browser console or terminal message, then send it so it can be fixed.
