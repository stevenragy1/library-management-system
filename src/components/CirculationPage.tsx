import { useEffect, useState } from "react";
import { api, Book, Member, Txn } from "../api";

// Issue & return (Step 2) with members (supporting data).
export function CirculationPage({ onChange }: { onChange: () => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [bookId, setBookId] = useState<number | "">("");
  const [memberId, setMemberId] = useState<number | "">("");
  const [filter, setFilter] = useState<"open" | "returned" | "all">("open");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [newMember, setNewMember] = useState({ name: "", email: "" });

  const refresh = async () => {
    const [b, m, t] = await Promise.all([api.books(), api.members(), api.transactions(filter)]);
    setBooks(b);
    setMembers(m);
    setTxns(t);
  };

  useEffect(() => {
    refresh().catch((e) => setMessage({ kind: "error", text: (e as Error).message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const run = async (fn: () => Promise<unknown>, okText: string) => {
    try {
      await fn();
      setMessage({ kind: "ok", text: okText });
      await refresh();
      onChange();
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    }
  };

  return (
    <section>
      <h2>Issue &amp; Return</h2>
      {message && <div className={message.kind === "ok" ? "notice" : "alert"}>{message.text}</div>}

      <div className="two-col">
        <div className="card">
          <h3>Issue a book</h3>
          <select value={bookId} onChange={(e) => setBookId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Select a book</option>
            {books.map((b) => (
              <option key={b.id} value={b.id} disabled={b.copies_available < 1}>
                {b.title} ({b.copies_available} left)
              </option>
            ))}
          </select>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Select a member</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button disabled={!bookId || !memberId} onClick={() => run(() => api.issue(Number(bookId), Number(memberId)), "Book issued. Due in 14 days.")}>
            Issue book
          </button>
        </div>

        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api.addMember(newMember), "Member added.").then(() => setNewMember({ name: "", email: "" }));
          }}
        >
          <h3>Register a member</h3>
          <input required placeholder="Full name" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} />
          <input required type="email" placeholder="Email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} />
          <button type="submit">Add member</button>
        </form>
      </div>

      <div className="toolbar">
        <h3>Transactions</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="open">On loan</option>
          <option value="returned">Returned</option>
          <option value="all">All</option>
        </select>
      </div>

      <table>
        <thead>
          <tr><th>Book</th><th>Member</th><th>Issued</th><th>Due</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {txns.map((t) => {
            const overdue = !t.returned_at && t.due_date < new Date().toISOString().slice(0, 10);
            return (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.member_name}</td>
                <td>{t.issued_at}</td>
                <td>{t.due_date}</td>
                <td>
                  {t.returned_at ? `Returned ${t.returned_at}${t.fine ? ` · fine $${t.fine}` : ""}` : overdue ? <span className="badge late">Overdue</span> : <span className="badge">On loan</span>}
                </td>
                <td>
                  {!t.returned_at && (
                    <button className="small" onClick={() => run(() => api.returnBook(t.id), `"${t.title}" returned.`)}>Return</button>
                  )}
                </td>
              </tr>
            );
          })}
          {txns.length === 0 && <tr><td colSpan={6} className="muted">No transactions.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
