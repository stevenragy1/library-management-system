import { useEffect, useState } from "react";
import { api, Book, Member } from "../api";

// Issue a book to a member (Step 2). Due date is 14 days from today, the same rule the server applies.
export function IssuePage({ onChange }: { onChange: () => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [bookId, setBookId] = useState<number | "">("");
  const [memberId, setMemberId] = useState<number | "">("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ book: string; member: string; due: string } | null>(null);

  const refresh = async () => {
    try {
      const [b, m] = await Promise.all([api.books(), api.members()]);
      setBooks(b);
      setMembers(m);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const selectedBook = books.find((b) => b.id === bookId);
  const dueDate = formatDue(14);

  const issue = async () => {
    try {
      await api.issue(Number(bookId), Number(memberId));
      setSuccess({
        book: selectedBook?.title ?? "",
        member: members.find((m) => m.id === memberId)?.name ?? "",
        due: dueDate,
      });
      setBookId("");
      setMemberId("");
      setError("");
      await refresh();
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col w-full items-center justify-center min-h-[calc(100vh-14rem)] py-space-xl relative">
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e6453c]/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {error && <div className="mb-4 w-full max-w-[420px] px-4 py-3 rounded-xl bg-[#e6453c]/15 border border-[#e6453c]/40 text-[#ffb4ab] text-sm">{error}</div>}

      <div className="w-full max-w-[420px] bg-[#2c2e32]/80 backdrop-blur-[20px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] border border-white/10 rounded-2xl p-8 relative flex flex-col transition-all duration-300">
        <div className="flex items-center justify-center mb-space-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.07] border border-white/[0.1] shadow-inner">
            <span className="material-symbols-outlined text-[#3371bb] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>book_online</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#3371bb] font-bold">Book Circulation / Loan Desk</span>
          </div>
        </div>

        <div className="text-center mb-space-xl">
          <h2 className="font-headline text-2xl text-[#f5f4f0] font-bold tracking-tight mb-1.5">Issue Book to Member</h2>
          <p className="font-body-md text-body-md text-neutral-400 leading-relaxed">Select a book and an active member to record a new loan.</p>
        </div>

        <form className="flex flex-col gap-space-lg" onSubmit={(e) => { e.preventDefault(); issue(); }}>
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="font-label-lg text-label-lg text-[#f5f4f0] font-semibold">Book</label>
              <span className="font-label-sm text-label-sm text-neutral-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3371bb] shadow-[0_0_6px_rgba(51,113,187,0.8)]" /> Live Inventory
              </span>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3371bb]">
                <span className="material-symbols-outlined text-[20px]">auto_stories</span>
              </div>
              <select
                required
                value={bookId}
                onChange={(e) => setBookId(e.target.value ? Number(e.target.value) : "")}
                className="appearance-none w-full pl-10 pr-10 py-3 bg-[#1f2023]/90 hover:bg-[#1f2023] text-[#f5f4f0] border border-white/10 font-body-md text-body-md rounded-xl shadow-inner focus:outline-none focus:border-[#3371bb] focus:ring-1 focus:ring-[#3371bb] transition-all cursor-pointer"
              >
                <option value="" disabled hidden>Select title...</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id} disabled={b.copies_available < 1} className="bg-[#141516] text-[#f5f4f0]">
                    {b.title} ({b.copies_available} left){b.copies_available < 1 ? " - Currently unavailable" : ""}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400">
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </div>
            </div>
            {selectedBook && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#1f2023]/70 border border-white/[0.06] text-neutral-300 font-label-sm text-label-sm mt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#3371bb]">category</span>
                  <span>{selectedBook.author} • {selectedBook.category}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#3371bb]/20 border border-[#3371bb]/40 text-[#3371bb] font-bold text-[10px]">{selectedBook.copies_available} Available</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="font-label-lg text-label-lg text-[#f5f4f0] font-semibold">Member</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3371bb]">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
              <select
                required
                value={memberId}
                onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : "")}
                className="appearance-none w-full pl-10 pr-10 py-3 bg-[#1f2023]/90 hover:bg-[#1f2023] text-[#f5f4f0] border border-white/10 font-body-md text-body-md rounded-xl shadow-inner focus:outline-none focus:border-[#3371bb] focus:ring-1 focus:ring-[#3371bb] transition-all cursor-pointer"
              >
                <option value="" disabled hidden>Choose patron member...</option>
                {members.map((m) => <option key={m.id} value={m.id} className="bg-[#141516] text-[#f5f4f0]">{m.name} ({m.email})</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400">
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1f2023]/70 border border-[#3371bb]/30 shadow-inner flex items-start gap-3">
            <span className="material-symbols-outlined text-[#3371bb] text-[20px] shrink-0 mt-0.5">schedule</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-label-md text-label-md text-[#f5f4f0] font-semibold">Standard loan period: 14 days</span>
              <p className="font-body-sm text-body-sm text-neutral-400">
                Due date will be set to two weeks from today (<span className="font-semibold text-[#3371bb]">{dueDate}</span>).
              </p>
            </div>
          </div>

          <div className="pt-1 flex flex-col gap-3">
            <button
              type="submit"
              disabled={!bookId || !memberId}
              className="w-full py-3.5 px-6 rounded-xl font-label-lg text-label-lg font-bold text-white bg-gradient-to-r from-[#e6453c] to-[#d02d24] hover:from-[#3371bb] hover:to-[#1d4ed8] shadow-[0_0_24px_rgba(230,69,60,0.5)] hover:shadow-[0_0_32px_rgba(51,113,187,0.75)] hover:scale-[1.01] active:scale-[0.99] border border-[#e6453c]/50 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 disabled:bg-[#1f2023] disabled:bg-none disabled:text-neutral-500"
            >
              <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
              <span>Issue book</span>
            </button>
          </div>
        </form>

        {success && (
          <div className="absolute inset-0 bg-[#141516]/95 border border-white/10 backdrop-blur-2xl rounded-2xl p-8 flex flex-col items-center justify-center text-center z-20">
            <div className="w-16 h-16 rounded-full bg-[#3371bb]/20 border border-[#3371bb]/40 flex items-center justify-center text-[#3371bb] mb-space-md shadow-[0_0_20px_rgba(51,113,187,0.35)]">
              <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h3 className="font-headline text-headline-sm text-white font-bold mb-1">Loan Recorded Successfully!</h3>
            <p className="font-body-md text-body-md text-neutral-300 mb-space-lg px-2">
              <strong className="text-white font-bold">{success.book}</strong> issued to <strong className="text-white font-bold">{success.member}</strong>. Return due by <span className="text-[#3371bb] font-bold">{success.due}</span>.
            </p>
            <button onClick={() => setSuccess(null)} className="px-6 py-2.5 rounded-full font-label-lg text-label-lg bg-[#e6453c]/25 hover:bg-[#3371bb]/40 border border-[#e6453c]/50 text-white transition-all shadow-md">
              Issue Another Book
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDue(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
