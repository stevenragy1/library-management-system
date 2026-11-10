// System validation tests (Step 5). Run with: npm test
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { openDatabase, LibraryService, LibraryError, LOAN_DAYS } from "../db.js";

let clock = new Date("2026-01-01T10:00:00Z");
let svc: LibraryService;

beforeEach(() => {
  clock = new Date("2026-01-01T10:00:00Z");
  svc = new LibraryService(openDatabase(":memory:"), () => clock);
});

describe("book management", () => {
  test("adds a book with all copies available", () => {
    const b = svc.addBook({ isbn: "111", title: "Dune", author: "Herbert", copies: 2 });
    assert.equal(b.copies_total, 2);
    assert.equal(b.copies_available, 2);
    assert.equal(b.category, "General");
  });

  test("rejects duplicate ISBN", () => {
    svc.addBook({ isbn: "111", title: "A", author: "X", copies: 1 });
    assert.throws(() => svc.addBook({ isbn: "111", title: "B", author: "Y", copies: 1 }), /already exists/);
  });

  test("rejects missing fields and invalid copy counts", () => {
    assert.throws(() => svc.addBook({ isbn: "", title: "A", author: "X", copies: 1 }), LibraryError);
    assert.throws(() => svc.addBook({ isbn: "2", title: "A", author: "X", copies: 0 }), LibraryError);
  });

  test("cannot reduce copies below the number on loan", () => {
    const b = svc.addBook({ isbn: "1", title: "A", author: "X", copies: 3 });
    const m = svc.addMember({ name: "Ali", email: "ali@x.com" });
    svc.issueBook(b.id, m.id);
    assert.throws(() => svc.updateBook(b.id, { copies_total: 0 }), /on loan/);
    const updated = svc.updateBook(b.id, { copies_total: 2 });
    assert.equal(updated.copies_available, 1);
  });

  test("search matches title, author, ISBN and category", () => {
    svc.addBook({ isbn: "978-1", title: "Dune", author: "Frank Herbert", category: "Sci-Fi", copies: 1 });
    svc.addBook({ isbn: "978-2", title: "Emma", author: "Jane Austen", category: "Classic", copies: 1 });
    assert.equal(svc.searchBooks("dune").length, 1);
    assert.equal(svc.searchBooks("austen").length, 1);
    assert.equal(svc.searchBooks("978-2").length, 1);
    assert.equal(svc.searchBooks("sci-fi", "category").length, 1);
    assert.equal(svc.searchBooks("nothing").length, 0);
  });

  test("cannot delete a book that is on loan or has history", () => {
    const b = svc.addBook({ isbn: "1", title: "A", author: "X", copies: 1 });
    const m = svc.addMember({ name: "Ali", email: "ali@x.com" });
    const tx = svc.issueBook(b.id, m.id);
    assert.throws(() => svc.deleteBook(b.id), /on loan/);
    svc.returnBook(tx.id);
    assert.throws(() => svc.deleteBook(b.id), /history/);
  });
});

describe("issue and return", () => {
  test("issuing decrements stock and sets a due date", () => {
    const b = svc.addBook({ isbn: "1", title: "A", author: "X", copies: 1 });
    const m = svc.addMember({ name: "Ali", email: "ali@x.com" });
    const tx = svc.issueBook(b.id, m.id);
    assert.equal(svc.getBook(b.id).copies_available, 0);
    assert.equal(tx.issued_at, "2026-01-01");
    assert.equal(tx.due_date, "2026-01-15");
    assert.equal(LOAN_DAYS, 14);
  });

  test("cannot issue when no copies are left", () => {
    const b = svc.addBook({ isbn: "1", title: "A", author: "X", copies: 1 });
    const m1 = svc.addMember({ name: "A", email: "a@x.com" });
    const m2 = svc.addMember({ name: "B", email: "b@x.com" });
    svc.issueBook(b.id, m1.id);
    assert.throws(() => svc.issueBook(b.id, m2.id), /No copies/);
  });

  test("a member cannot hold more than 3 books", () => {
    const m = svc.addMember({ name: "A", email: "a@x.com" });
    for (let i = 0; i < 4; i++) {
      const b = svc.addBook({ isbn: `i${i}`, title: `T${i}`, author: "X", copies: 1 });
      if (i < 3) svc.issueBook(b.id, m.id);
      else assert.throws(() => svc.issueBook(b.id, m.id), /3 books/);
    }
  });

  test("returning on time restores stock with no fine", () => {
    const b = svc.addBook({ isbn: "1", title: "A", author: "X", copies: 1 });
    const m = svc.addMember({ name: "A", email: "a@x.com" });
    const tx = svc.issueBook(b.id, m.id);
    clock = new Date("2026-01-10T10:00:00Z");
    const returned = svc.returnBook(tx.id);
    assert.equal(returned.fine, 0);
    assert.equal(svc.getBook(b.id).copies_available, 1);
  });

  test("late return charges a fine per day overdue", () => {
    const b = svc.addBook({ isbn: "1", title: "A", author: "X", copies: 1 });
    const m = svc.addMember({ name: "A", email: "a@x.com" });
    const tx = svc.issueBook(b.id, m.id);
    clock = new Date("2026-01-20T10:00:00Z"); // 5 days after due date
    assert.equal(svc.returnBook(tx.id).fine, 5);
  });

  test("a book cannot be returned twice", () => {
    const b = svc.addBook({ isbn: "1", title: "A", author: "X", copies: 1 });
    const m = svc.addMember({ name: "A", email: "a@x.com" });
    const tx = svc.issueBook(b.id, m.id);
    svc.returnBook(tx.id);
    assert.throws(() => svc.returnBook(tx.id), /already been returned/);
    assert.equal(svc.getBook(b.id).copies_available, 1); // stock not double-counted
  });
});

describe("members", () => {
  test("validates email and enforces uniqueness", () => {
    assert.throws(() => svc.addMember({ name: "A", email: "not-an-email" }), LibraryError);
    svc.addMember({ name: "A", email: "A@x.com" });
    assert.throws(() => svc.addMember({ name: "B", email: "a@x.com" }), /already exists/);
  });
});

describe("reports", () => {
  test("summarises stock, loans, overdue items and popularity", () => {
    const b1 = svc.addBook({ isbn: "1", title: "Dune", author: "Herbert", category: "Sci-Fi", copies: 2 });
    svc.addBook({ isbn: "2", title: "Emma", author: "Austen", category: "Classic", copies: 1 });
    const m = svc.addMember({ name: "Ali", email: "ali@x.com" });
    svc.issueBook(b1.id, m.id);

    const r = svc.reports("2026-02-01");
    assert.equal(r.totals.titles, 2);
    assert.equal(r.totals.copies, 3);
    assert.equal(r.totals.available, 2);
    assert.equal(r.totals.on_loan, 1);
    assert.equal(r.overdue.length, 1);
    assert.equal(r.popular[0].title, "Dune");
    assert.equal(r.byCategory.length, 2);
  });
});
