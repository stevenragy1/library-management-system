// Thin client for the REST API. All network calls live here.
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export interface Book { id: number; isbn: string; title: string; author: string; category: string; copies_total: number; copies_available: number }
export interface Member { id: number; name: string; email: string }
export interface Txn { id: number; book_id: number; member_id: number; title: string; member_name: string; issued_at: string; due_date: string; returned_at: string | null; fine: number }
export interface Report {
  generatedOn: string;
  totals: { titles: number; copies: number; available: number; members: number; on_loan: number; fines_collected: number };
  overdue: { id: number; title: string; member_name: string; due_date: string }[];
  popular: { title: string; author: string; loans: number }[];
  byCategory: { category: string; titles: number; copies: number }[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) });

export const api = {
  books: (q = "") => request<Book[]>(`/books${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  addBook: (b: Omit<Book, "id" | "copies_available" | "copies_total"> & { copies: number }) => post<Book>("/books", b),
  updateBook: (id: number, b: Partial<Book>) => put<Book>(`/books/${id}`, b),
  deleteBook: (id: number) => request<{ ok: true }>(`/books/${id}`, { method: "DELETE" }),
  members: () => request<Member[]>("/members"),
  addMember: (m: { name: string; email: string }) => post<Member>("/members", m),
  transactions: (status = "all") => request<Txn[]>(`/transactions?status=${status}`),
  issue: (bookId: number, memberId: number) => post<Txn>("/transactions", { bookId, memberId }),
  returnBook: (id: number) => post<Txn>(`/transactions/${id}/return`, {}),
  reports: () => request<Report>("/reports"),
};
