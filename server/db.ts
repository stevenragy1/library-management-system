// Database layer: schema, queries and business rules.
// Uses Node's built-in SQLite (node:sqlite), so no native dependency is needed.
import { DatabaseSync } from "node:sqlite";

export interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  category: string;
  copies_total: number;
  copies_available: number;
  created_at: string;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  book_id: number;
  member_id: number;
  issued_at: string;
  due_date: string;
  returned_at: string | null;
  fine: number;
}

export const LOAN_DAYS = 14;
export const FINE_PER_DAY = 1;

export class LibraryError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
  }
}

export function openDatabase(file: string = "library.db"): DatabaseSync {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      copies_total INTEGER NOT NULL CHECK (copies_total >= 0),
      copies_available INTEGER NOT NULL CHECK (copies_available >= 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (copies_available <= copies_total)
    );
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL REFERENCES books(id),
      member_id INTEGER NOT NULL REFERENCES members(id),
      issued_at TEXT NOT NULL,
      due_date TEXT NOT NULL,
      returned_at TEXT,
      fine REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_tx_open ON transactions(returned_at);
    CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
  `);
  return db;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export class LibraryService {
  constructor(private db: DatabaseSync, private now: () => Date = () => new Date()) {}

  // ---------- Books ----------
  addBook(input: { isbn: string; title: string; author: string; category?: string; copies: number }): Book {
    if (!input.isbn?.trim() || !input.title?.trim() || !input.author?.trim()) {
      throw new LibraryError("ISBN, title and author are required");
    }
    if (!Number.isInteger(input.copies) || input.copies < 1) {
      throw new LibraryError("Copies must be a whole number of at least 1");
    }
    try {
      const res = this.db
        .prepare(
          `INSERT INTO books (isbn, title, author, category, copies_total, copies_available)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(input.isbn.trim(), input.title.trim(), input.author.trim(), input.category?.trim() || "General", input.copies, input.copies);
      return this.getBook(Number(res.lastInsertRowid));
    } catch (e) {
      if (String(e).includes("UNIQUE")) throw new LibraryError("A book with this ISBN already exists", 409);
      throw e;
    }
  }

  getBook(id: number): Book {
    const row = this.db.prepare("SELECT * FROM books WHERE id = ?").get(id) as Book | undefined;
    if (!row) throw new LibraryError("Book not found", 404);
    return row;
  }

  updateBook(id: number, changes: Partial<Pick<Book, "title" | "author" | "category">> & { copies_total?: number }): Book {
    const book = this.getBook(id);
    const newTotal = changes.copies_total ?? book.copies_total;
    const issued = book.copies_total - book.copies_available;
    if (newTotal < issued) {
      throw new LibraryError(`Cannot reduce total copies below the ${issued} currently on loan`);
    }
    this.db
      .prepare(
        `UPDATE books SET title = ?, author = ?, category = ?, copies_total = ?, copies_available = ? WHERE id = ?`
      )
      .run(
        changes.title ?? book.title,
        changes.author ?? book.author,
        changes.category ?? book.category,
        newTotal,
        newTotal - issued,
        id
      );
    return this.getBook(id);
  }

  deleteBook(id: number): void {
    const book = this.getBook(id);
    if (book.copies_available !== book.copies_total) {
      throw new LibraryError("Cannot delete a book that still has copies on loan");
    }
    const hasHistory = this.db.prepare("SELECT 1 FROM transactions WHERE book_id = ? LIMIT 1").get(id);
    if (hasHistory) throw new LibraryError("Cannot delete a book with transaction history", 409);
    this.db.prepare("DELETE FROM books WHERE id = ?").run(id);
  }

  searchBooks(query: string = "", field: "all" | "title" | "author" | "isbn" | "category" = "all"): Book[] {
    const q = `%${query.trim()}%`;
    const cols: Record<string, string[]> = {
      all: ["title", "author", "isbn", "category"],
      title: ["title"],
      author: ["author"],
      isbn: ["isbn"],
      category: ["category"],
    };
    const where = cols[field].map((c) => `${c} LIKE ?`).join(" OR ");
    return this.db
      .prepare(`SELECT * FROM books WHERE ${where} ORDER BY title`)
      .all(...cols[field].map(() => q)) as unknown as Book[];
  }

  listBooks(): Book[] {
    return this.db.prepare("SELECT * FROM books ORDER BY title").all() as unknown as Book[];
  }

  // ---------- Members ----------
  addMember(input: { name: string; email: string }): Member {
    if (!input.name?.trim() || !/^\S+@\S+\.\S+$/.test(input.email ?? "")) {
      throw new LibraryError("A name and a valid email are required");
    }
    try {
      const res = this.db
        .prepare("INSERT INTO members (name, email) VALUES (?, ?)")
        .run(input.name.trim(), input.email.trim().toLowerCase());
      return this.db.prepare("SELECT * FROM members WHERE id = ?").get(Number(res.lastInsertRowid)) as unknown as Member;
    } catch (e) {
      if (String(e).includes("UNIQUE")) throw new LibraryError("A member with this email already exists", 409);
      throw e;
    }
  }

  listMembers(): Member[] {
    return this.db.prepare("SELECT * FROM members ORDER BY name").all() as unknown as Member[];
  }

  // ---------- Issue & return ----------
  issueBook(bookId: number, memberId: number): Transaction {
    const member = this.db.prepare("SELECT id FROM members WHERE id = ?").get(memberId);
    if (!member) throw new LibraryError("Member not found", 404);

    // Business rule: a member may hold at most 3 books at once.
    const open = this.db
      .prepare("SELECT COUNT(*) AS n FROM transactions WHERE member_id = ? AND returned_at IS NULL")
      .get(memberId) as { n: number };
    if (open.n >= 3) throw new LibraryError("Member already has 3 books on loan");

    // Wrap in a transaction so the stock check and update cannot race.
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const book = this.getBook(bookId);
      if (book.copies_available < 1) throw new LibraryError("No copies available for this book", 409);
      this.db.prepare("UPDATE books SET copies_available = copies_available - 1 WHERE id = ?").run(bookId);
      const issued = this.now();
      const res = this.db
        .prepare("INSERT INTO transactions (book_id, member_id, issued_at, due_date) VALUES (?, ?, ?, ?)")
        .run(bookId, memberId, isoDate(issued), isoDate(addDays(issued, LOAN_DAYS)));
      this.db.exec("COMMIT");
      return this.getTransaction(Number(res.lastInsertRowid));
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  returnBook(transactionId: number): Transaction {
    const tx = this.getTransaction(transactionId);
    if (tx.returned_at) throw new LibraryError("This book has already been returned", 409);
    const today = isoDate(this.now());
    const late = daysBetween(tx.due_date, today);
    const fine = late * FINE_PER_DAY;

    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("UPDATE transactions SET returned_at = ?, fine = ? WHERE id = ?")
        .run(today, fine, transactionId);
      this.db.prepare("UPDATE books SET copies_available = copies_available + 1 WHERE id = ?").run(tx.book_id);
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
    return this.getTransaction(transactionId);
  }

  getTransaction(id: number): Transaction {
    const row = this.db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as Transaction | undefined;
    if (!row) throw new LibraryError("Transaction not found", 404);
    return row;
  }

  listTransactions(filter: "open" | "returned" | "all" = "all"): (Transaction & { title: string; member_name: string })[] {
    const where = filter === "open" ? "WHERE t.returned_at IS NULL" : filter === "returned" ? "WHERE t.returned_at IS NOT NULL" : "";
    return this.db
      .prepare(
        `SELECT t.*, b.title, m.name AS member_name
         FROM transactions t
         JOIN books b ON b.id = t.book_id
         JOIN members m ON m.id = t.member_id
         ${where}
         ORDER BY t.issued_at DESC, t.id DESC`
      )
      .all() as unknown as (Transaction & { title: string; member_name: string })[];
  }

  // ---------- Reports ----------
  reports(referenceDate?: string) {
    const today = referenceDate ?? isoDate(this.now());
    const totals = this.db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM books) AS titles,
           (SELECT COALESCE(SUM(copies_total), 0) FROM books) AS copies,
           (SELECT COALESCE(SUM(copies_available), 0) FROM books) AS available,
           (SELECT COUNT(*) FROM members) AS members,
           (SELECT COUNT(*) FROM transactions WHERE returned_at IS NULL) AS on_loan,
           (SELECT COALESCE(SUM(fine), 0) FROM transactions) AS fines_collected`
      )
      .get() as Record<string, number>;

    const overdue = this.db
      .prepare(
        `SELECT t.id, b.title, m.name AS member_name, t.due_date
         FROM transactions t JOIN books b ON b.id = t.book_id JOIN members m ON m.id = t.member_id
         WHERE t.returned_at IS NULL AND t.due_date < ?
         ORDER BY t.due_date`
      )
      .all(today) as { id: number; title: string; member_name: string; due_date: string }[];

    const popular = this.db
      .prepare(
        `SELECT b.title, b.author, COUNT(t.id) AS loans
         FROM books b LEFT JOIN transactions t ON t.book_id = b.id
         GROUP BY b.id ORDER BY loans DESC, b.title LIMIT 5`
      )
      .all() as { title: string; author: string; loans: number }[];

    const byCategory = this.db
      .prepare("SELECT category, COUNT(*) AS titles, SUM(copies_total) AS copies FROM books GROUP BY category ORDER BY category")
      .all() as { category: string; titles: number; copies: number }[];

    return { generatedOn: today, totals, overdue, popular, byCategory };
  }
}
