import { useEffect, useState, FormEvent } from "react";
import { api, Book } from "../api";

// Book management (Step 1): add, search, filter by category, adjust copies, delete.
export function BooksPage({ onChange }: { onChange: () => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ isbn: "", title: "", author: "", category: "", copies: 1 });

  // Category pills are built from the categories that actually exist in the catalogue.
  const categories = Array.from(new Set(books.map((b) => b.category))).sort();

  const load = async (q = query) => {
    try {
      setBooks(await api.books(q));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.addBook(form);
      setForm({ isbn: "", title: "", author: "", category: "", copies: 1 });
      await load();
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const changeCopies = async (book: Book, total: number) => {
    try {
      await api.updateBook(book.id, { copies_total: total });
      await load();
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const remove = async (book: Book) => {
    if (!confirm(`Delete "${book.title}"?`)) return;
    try {
      await api.deleteBook(book.id);
      await load();
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const visible = category === "ALL" ? books : books.filter((b) => b.category === category);

  return (
    <div className="flex flex-col w-full">
      {error && <div className="mb-4 px-4 py-3 rounded-xl bg-[#e6453c]/15 border border-[#e6453c]/40 text-[#ffb4ab] text-sm">{error}</div>}

      {/* Acquisition form */}
      <section className="w-full mb-8 relative">
        <div className="rounded-2xl bg-[#2c2e32]/75 border border-[#74403c]/30 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-space-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e6453c]/20 border border-[#e6453c]/40 flex items-center justify-center text-[#ffb4ab] shadow-[0_0_12px_rgba(230,69,60,0.3)]">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-[#f5f4f0] tracking-tight font-bold">Acquire New Volume</h2>
                <p className="font-body-sm text-body-sm text-[#d4d0c8]">Register physical holdings directly into the centralized catalog</p>
              </div>
            </div>
          </div>

          <form className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end" onSubmit={submit}>
            <div className="md:col-span-2">
              <label className="block font-label-md text-label-md text-[#d4d0c8] mb-1 font-semibold">ISBN-13</label>
              <input required placeholder="e.g. 978-0140449136" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} className={inputCls} />
            </div>
            <div className="md:col-span-3">
              <label className="block font-label-md text-label-md text-[#d4d0c8] mb-1 font-semibold">Book Title</label>
              <input required placeholder="e.g. The Great Gatsby" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </div>
            <div className="md:col-span-3">
              <label className="block font-label-md text-label-md text-[#d4d0c8] mb-1 font-semibold">Author</label>
              <input required placeholder="e.g. F. Scott Fitzgerald" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block font-label-md text-label-md text-[#d4d0c8] mb-1 font-semibold">Category</label>
              <input placeholder="e.g. Fiction" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <div className="w-1/2">
                <label className="block font-label-md text-label-md text-[#d4d0c8] mb-1 font-semibold">Copies</label>
                <input required type="number" min={1} max={99} value={form.copies} onChange={(e) => setForm({ ...form, copies: Number(e.target.value) })} className={inputCls + " text-center"} />
              </div>
              <div className="w-1/2 flex items-end">
                {/* Hover changes the colour from red to blue */}
                <button type="submit" className="w-full h-[42px] flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#e6453c] to-[#d02d24] hover:from-[#3371bb] hover:to-[#1d4ed8] text-white font-label-lg text-label-lg shadow-[0_0_20px_rgba(230,69,60,0.4)] hover:shadow-[0_0_28px_rgba(51,113,187,0.6)] hover:-translate-y-0.5 active:translate-y-0 border border-[#ffb4ab]/30 transition-all duration-300 select-none font-semibold">
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>Add</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Search and category filter */}
      <section className="w-full mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3371bb] text-lg select-none">search</span>
          <input
            placeholder="Search by title, author, ISBN or category..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              load(e.target.value);
            }}
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[#2c2e32]/75 border border-[#74403c]/30 backdrop-blur-2xl text-white placeholder:text-slate-400 font-body-md text-body-md shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus:ring-2 focus:ring-[#3371bb]/50 focus:border-[#3371bb] transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#2c2e32]/80 border border-[#74403c]/30 backdrop-blur-md shadow-sm self-start lg:self-auto flex-wrap">
          {["ALL", ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={
                category === c
                  ? "px-3 py-1 rounded-full font-label-md text-label-md bg-gradient-to-r from-[#3371bb] to-[#1d4ed8] text-white font-bold shadow-[0_0_12px_rgba(51,113,187,0.4)] border border-[#3371bb]/40 transition-all"
                  : "px-3 py-1 rounded-full font-label-md text-label-md text-[#d4d0c8] hover:text-white hover:bg-white/[0.08] transition-all"
              }
            >
              {c === "ALL" ? "All" : c}
            </button>
          ))}
        </div>
      </section>

      {/* Catalogue table */}
      <section className="w-full">
        <div className="rounded-2xl bg-[#2c2e32]/75 border border-[#74403c]/30 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0d0e10]/60 border-b border-white/[0.08] backdrop-blur-md">
                  {["Book Details", "Author", "ISBN Identifier", "Classification"].map((h) => (
                    <th key={h} className="py-3.5 px-5 font-label-md text-label-md uppercase tracking-wider text-[#d4d0c8] font-bold">{h}</th>
                  ))}
                  <th className="py-3.5 px-5 font-label-md text-label-md uppercase tracking-wider text-[#d4d0c8] font-bold text-center">Circulation &amp; Stock</th>
                  <th className="py-3.5 px-5 font-label-md text-label-md uppercase tracking-wider text-[#d4d0c8] font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {visible.map((b) => (
                  <tr key={b.id} className="group hover:bg-white/[0.04] transition-colors duration-150">
                    <td className="py-4 px-5">
                      <div className="font-headline-sm text-headline-sm font-semibold text-[#f5f4f0] group-hover:text-[#a5c8ff] transition-colors">{b.title}</div>
                    </td>
                    <td className="py-4 px-5 font-body-sm text-body-sm text-[#d4d0c8]">{b.author}</td>
                    <td className="py-4 px-5 font-body-sm text-body-sm text-[#d4d0c8]">{b.isbn}</td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#3371bb]/20 border border-[#3371bb]/40 text-[#a5c8ff] font-label-sm text-label-sm">{b.category}</span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-center gap-2">
                        <span className={b.copies_available === 0 ? "text-[#ffb4ab] font-bold" : "text-[#f5f4f0] font-bold"}>
                          {b.copies_available} / {b.copies_total}
                        </span>
                        <button onClick={() => changeCopies(b, b.copies_total + 1)} className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 hover:bg-[#3371bb]/30 text-white transition-colors">+</button>
                        <button
                          onClick={() => changeCopies(b, b.copies_total - 1)}
                          disabled={b.copies_available < 1}
                          title="Only copies not on loan can be removed"
                          className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 hover:bg-[#e6453c]/30 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button onClick={() => remove(b)} className="px-3 py-1.5 rounded-lg bg-[#e6453c]/15 hover:bg-[#e6453c]/35 border border-[#e6453c]/40 text-[#ffb4ab] text-xs font-semibold transition-colors">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 font-body-sm">No books found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-[#0d0e10]/80 border border-[#74403c]/30 backdrop-blur-md text-white placeholder:text-slate-500 font-body-sm text-body-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-[#e6453c]/50 focus:border-[#e6453c] transition-all";
