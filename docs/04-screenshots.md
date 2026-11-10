# 04 · Screenshots

Screenshots of the running system, for the project report and for checking the UI against the design.

## How to capture them

1. In VS Code's terminal, run `npm run dev` and open http://localhost:5173.
2. Add a few books, members and loans first, so the tables and reports have data.
3. Take each screenshot below at a window width of about 1280px.
4. Save the image in `docs/screenshots/` using the file name shown. Create the folder if it doesn't exist.

## Checklist

| # | File name | Page | What to show |
|---|---|---|---|
| 1 | `01-books-empty.png` | Books | Empty catalogue with the "No books found." state |
| 2 | `02-books-add-form.png` | Books | The Acquire New Volume form filled in |
| 3 | `03-books-catalogue.png` | Books | The table with several books and their stock counts |
| 4 | `04-books-search.png` | Books | Search box with a term typed in and results filtered |
| 5 | `05-books-category-filter.png` | Books | A category pill selected, showing only that category |
| 6 | `06-books-add-hover.png` | Books | Mouse over **Add**, showing the blue hover state |
| 7 | `07-issue-empty.png` | Issue | Issue form with nothing selected and the button disabled |
| 8 | `08-issue-selected.png` | Issue | A book and member selected, with the 14-day loan notice |
| 9 | `09-issue-success.png` | Issue | The "Loan Recorded Successfully!" overlay |
| 10 | `10-members-register.png` | Members & Transactions | The Register a member card |
| 11 | `11-transactions-list.png` | Members & Transactions | Transactions table with On loan, Overdue and Returned status pills |
| 12 | `12-transactions-filter.png` | Members & Transactions | The status filter set to **Overdue** |
| 13 | `13-reports-stats.png` | Reports | The seven stat cards at the top |
| 14 | `14-reports-tables.png` | Reports | Overdue, Most borrowed and Collection by category tables |
| 15 | `15-reports-print-hover.png` | Reports | Mouse over **Print / save as PDF**, showing the blue hover state |
| 16 | `16-reports-print-preview.png` | Reports | The print preview (File → Print) with buttons hidden |

## Adding them to the docs

When the images are in `docs/screenshots/`, you can either:
- Insert them yourself in Markdown with `![Books page](screenshots/03-books-catalogue.png)` into the matching section of `docs/02-architecture.md` or in `docs/03-test-cases.md`.
