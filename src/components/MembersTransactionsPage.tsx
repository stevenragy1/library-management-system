import { useEffect, useState, FormEvent } from "react";
import { api, Member, Report, Txn } from "../api";

const today = () => new Date().toISOString().slice(0, 10);

// Register members and manage transactions (Step 2 supporting features).
export function MembersTransactionsPage({ onChange }: { onChange: () => void }) {
  const [report, setReport] = useState<Report | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [members, setMembers] = useState<(Member & { activeLoans: number })[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "onloan" | "overdue" | "returned">("all");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [newMember, setNewMember] = useState({ name: "", email: "" });

  const loadTxns = async () => {
    const status = filter === "returned" ? "returned" : filter === "all" ? "all" : "open";
    let rows = await api.transactions(status);
    if (filter === "overdue") rows = rows.filter((t) => !t.returned_at && t.due_date < today());
    setTxns(rows);
  };

  const loadReport = () => api.reports().then(setReport).catch(() => {});

  // Members list with each member's number of books currently on loan.
  const loadMembers = async () => {
    const [all, open] = await Promise.all([api.members(), api.transactions("open")]);
    setMembers(all.map((m) => ({ ...m, activeLoans: open.filter((t) => t.member_id === m.id).length })));
  };

  useEffect(() => {
    loadReport();
    loadMembers().catch((e) => setMessage({ kind: "error", text: (e as Error).message }));
  }, []);

  useEffect(() => {
    loadTxns().catch((e) => setMessage({ kind: "error", text: (e as Error).message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const registerMember = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.addMember(newMember);
      setNewMember({ name: "", email: "" });
      setMessage({ kind: "ok", text: "Patron added to the registry." });
      await loadMembers();
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
    }
  };

  const returnBook = async (t: Txn) => {
    try {
      await api.returnBook(t.id);
      setMessage({ kind: "ok", text: `"${t.title}" returned.` });
      await Promise.all([loadTxns(), loadReport(), loadMembers()]);
      onChange();
    } catch (err) {
      setMessage({ kind: "error", text: (err as Error).message });
    }
  };

  const overdueCount = report?.overdue.length ?? 0;
  const fines = report?.totals.fines_collected ?? 0;

  return (
    <div className="flex flex-col gap-8 w-full">
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm border ${message.kind === "ok" ? "bg-[#3371bb]/15 border-[#3371bb]/40 text-[#a5c8ff]" : "bg-[#e6453c]/15 border-[#e6453c]/40 text-[#ffb4ab]"}`}>
          {message.text}
        </div>
      )}

      {/* Register a member */}
      <section className="w-full relative">
        <div className="w-full rounded-2xl bg-[#2c2e32]/75 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#e6453c]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e6453c] text-2xl">person_add</span>
                <h2 className="text-xl font-bold tracking-tight text-[#f5f4f0] font-headline-sm">Register a member</h2>
              </div>
              <p className="text-xs text-slate-400">Create a new patron library account.</p>
            </div>
          </div>
          <form className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end relative z-10" onSubmit={registerMember}>
            <div className="md:col-span-5 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#f5f4f0] flex items-center justify-between font-label-md">
                <span>Full Name</span>
                <span className="text-slate-400 font-normal text-[11px]">Required</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">person</span>
                <input required placeholder="e.g. Clara Oswald" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} className={fieldCls} />
              </div>
            </div>
            <div className="md:col-span-5 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#f5f4f0] flex items-center justify-between font-label-md">
                <span>Email</span>
                <span className="text-slate-400 font-normal text-[11px]">Used for contact</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">alternate_email</span>
                <input required type="email" placeholder="e.g. clara.oswald@university.edu" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} className={fieldCls} />
              </div>
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="w-full h-[42px] px-5 rounded-xl bg-gradient-to-r from-[#e6453c] via-[#ec564c] to-[#d4372e] hover:from-[#3371bb] hover:to-[#1d4ed8] text-[#f5f4f0] font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(230,69,60,0.45)] hover:shadow-[0_0_25px_rgba(51,113,187,0.65)] hover:scale-[1.01] active:scale-[0.99] border border-[#ff8e86]/40 transition-all duration-300 select-none cursor-pointer font-label-md">
                <span className="material-symbols-outlined text-lg">add</span>
                <span>Add member</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Members list */}
      <section className="w-full flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-[#f5f4f0] font-headline-sm">Members</h3>
            <span className="px-3 py-1 rounded-full bg-[#2c2e32] border border-white/10 backdrop-blur-md text-slate-300 text-xs font-semibold shadow-sm font-label-md">
              {members.length} registered
            </span>
          </div>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-[#3371bb] text-lg pointer-events-none">search</span>
            <input
              placeholder="Search by name or email..."
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-72 rounded-xl bg-[#2c2e32]/90 border border-white/10 backdrop-blur-md text-xs text-[#f5f4f0] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3371bb] transition-all font-label-md"
            />
          </div>
        </div>

        <div className="w-full rounded-2xl bg-[#2c2e32]/75 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0d0e10]/70 backdrop-blur-md text-xs text-slate-400 tracking-wider uppercase border-b border-white/5 font-label-caps">
                  <th className="py-3.5 px-5 font-semibold">Member ID</th>
                  <th className="py-3.5 px-5 font-semibold">Name</th>
                  <th className="py-3.5 px-5 font-semibold">Email</th>
                  <th className="py-3.5 px-5 font-semibold text-center">Books on loan</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5">
                {members
                  .filter((m) => {
                    const q = memberQuery.trim().toLowerCase();
                    return !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
                  })
                  .map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.03] transition-colors duration-150">
                      <td className="py-4 px-5 text-[#a5c8ff] font-label-md">#{String(m.id).padStart(4, "0")}</td>
                      <td className="py-4 px-5 font-semibold text-[#f5f4f0]">{m.name}</td>
                      <td className="py-4 px-5 text-[#d4d0c8]">{m.email}</td>
                      <td className="py-4 px-5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.activeLoans >= 3 ? "bg-[#e6453c]/20 border-[#e6453c]/50 text-[#ffb4ab]" : "bg-[#3371bb]/20 border-[#3371bb]/40 text-[#a5c8ff]"}`}>
                          {m.activeLoans} / 3
                        </span>
                      </td>
                    </tr>
                  ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 font-body-sm">No members registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Key metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Metric icon="sync_alt" accent="#3371bb" label="On loan" value={report?.totals.on_loan ?? "–"} />
        <Metric icon="emergency" accent="#e6453c" label="Overdue" value={overdueCount} />
        <Metric icon="payments" accent="#3371bb" label="Fines collected ($)" value={fines} />
      </section>

      {/* Transactions */}
      <section className="w-full flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-[#f5f4f0] font-headline-sm">Transactions</h3>
            <span className="px-3 py-1 rounded-full bg-[#2c2e32] border border-white/10 backdrop-blur-md text-slate-300 text-xs font-semibold shadow-sm font-label-md">
              {txns.length} records
            </span>
          </div>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-slate-400 text-lg pointer-events-none">filter_list</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="appearance-none pl-9 pr-9 py-2 rounded-xl bg-[#2c2e32]/90 border border-white/10 backdrop-blur-md text-xs text-[#f5f4f0] font-medium shadow-sm hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#3371bb] cursor-pointer transition-all font-label-md">
              <option value="all" className="bg-[#141516]">All statuses</option>
              <option value="onloan" className="bg-[#141516]">On loan</option>
              <option value="overdue" className="bg-[#141516]">Overdue</option>
              <option value="returned" className="bg-[#141516]">Returned</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 text-slate-400 text-lg pointer-events-none">expand_more</span>
          </div>
        </div>

        <div className="w-full rounded-2xl bg-[#2c2e32]/75 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0d0e10]/70 backdrop-blur-md text-xs text-slate-400 tracking-wider uppercase border-b border-white/5 font-label-caps">
                  <th className="py-3.5 px-5 font-semibold">Book Title</th>
                  <th className="py-3.5 px-5 font-semibold">Member</th>
                  <th className="py-3.5 px-5 font-semibold">Issued</th>
                  <th className="py-3.5 px-5 font-semibold">Due Date</th>
                  <th className="py-3.5 px-5 font-semibold">Status</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5">
                {txns.map((t) => {
                  const overdue = !t.returned_at && t.due_date < today();
                  return (
                    <tr key={t.id} className="group hover:bg-white/[0.03] transition-colors duration-150">
                      <td className="py-4 px-5 font-semibold text-[#f5f4f0]">{t.title}</td>
                      <td className="py-4 px-5 text-[#d4d0c8]">{t.member_name}</td>
                      <td className="py-4 px-5 text-[#d4d0c8]">{t.issued_at}</td>
                      <td className="py-4 px-5 text-[#d4d0c8]">{t.due_date}</td>
                      <td className="py-4 px-5">
                        {t.returned_at ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-slate-300 text-xs">
                            Returned {t.returned_at}{t.fine ? ` · fine $${t.fine}` : ""}
                          </span>
                        ) : overdue ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#e6453c]/20 border border-[#e6453c]/50 text-[#ffb4ab] text-xs font-semibold">Overdue</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#3371bb]/20 border border-[#3371bb]/40 text-[#a5c8ff] text-xs font-semibold">On loan</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {!t.returned_at && (
                          <button onClick={() => returnBook(t)} className="px-3 py-1.5 rounded-lg bg-[#3371bb]/15 hover:bg-[#3371bb]/35 border border-[#3371bb]/40 text-[#a5c8ff] text-xs font-semibold transition-colors">
                            Return
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {txns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 font-body-sm">No transactions.</td>
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

function Metric({ icon, accent, label, value }: { icon: string; accent: string; label: string; value: number | string }) {
  return (
    <div className="bg-[#2c2e32]/75 border border-white/10 backdrop-blur-xl rounded-xl p-4 shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}26`, border: `1px solid ${accent}4d`, color: accent }}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </span>
      </div>
      <div className="text-2xl font-headline-md font-bold text-[#f5f4f0] tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="text-xs uppercase tracking-wider text-[#f5f4f0]/60 font-medium mt-1 font-label-caps">{label}</div>
    </div>
  );
}

const fieldCls =
  "w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141516]/80 border border-white/10 text-sm text-[#f5f4f0] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e6453c]/70 focus:border-[#e6453c]/70 shadow-inner transition-all";
