import { useEffect, useState, type ReactNode } from "react";
import { api, Report } from "../api";

// Report generation (Step 4), styled like the Stitch "Library Reports" screen.
export function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.reports().then(setReport).catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <div className="px-4 py-3 rounded-xl bg-[#e6453c]/15 border border-[#e6453c]/40 text-[#ffb4ab] text-sm">{error}</div>;
  if (!report) return <p className="text-slate-400">Generating report…</p>;

  const { totals } = report;
  const stats: [string, number][] = [
    ["Titles", totals.titles],
    ["Copies", totals.copies],
    ["Available", totals.available],
    ["On loan", totals.on_loan],
    ["Members", totals.members],
    ["Overdue", report.overdue.length],
    ["Fines ($)", totals.fines_collected],
  ];

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-headline-md text-headline-md text-[#f5f4f0] font-bold">Library Reports</h2>
          <p className="font-body-sm text-body-sm text-slate-400">Generated on {report.generatedOn}</p>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#e6453c] to-[#d02d24] hover:from-[#3371bb] hover:to-[#1d4ed8] text-white font-label-md text-label-md font-semibold shadow-[0_0_16px_rgba(230,69,60,0.4)] hover:shadow-[0_0_16px_rgba(51,113,187,0.4)] transition-all duration-300">
          Print / save as PDF
        </button>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-[#2c2e32]/75 border border-[#7f403c]/30 backdrop-blur-xl rounded-xl p-4 shadow-lg hover:border-[#3371bb]/50 hover:-translate-y-0.5 transition-all text-center flex flex-col justify-between group">
            <div className="text-2xl font-headline-md font-bold text-[#f5f4f0] tracking-tight group-hover:text-[#3371bb] transition-colors">{value.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-wider text-[#f5f4f0]/60 font-medium mt-1 font-label-caps">{label}</div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ReportCard className="lg:col-span-12" title="Overdue books" subtitle={`${report.overdue.length} unreturned volumes past their due date`} icon="emergency" accent="#e6453c">
          <ReportTable headers={["Book", "Member", "Due Date"]} empty={report.overdue.length === 0} emptyText="Nothing overdue.">
            {report.overdue.map((o) => (
              <tr key={o.id} className="hover:bg-[#141516]/40 transition-colors">
                <td className="py-3 px-4 text-[#f5f4f0] font-semibold">{o.title}</td>
                <td className="py-3 px-4 text-[#d4d0c8]">{o.member_name}</td>
                <td className="py-3 px-4 text-[#ffb4ab]">{o.due_date}</td>
              </tr>
            ))}
          </ReportTable>
        </ReportCard>

        <ReportCard className="lg:col-span-7" title="Most borrowed" subtitle="Top 5 titles by number of loans" icon="trending_up" accent="#3371bb">
          <ReportTable headers={["Title", "Author", "Loans"]} empty={report.popular.length === 0} emptyText="No loans yet.">
            {report.popular.map((p) => (
              <tr key={p.title} className="hover:bg-[#141516]/40 transition-colors">
                <td className="py-3 px-4 text-[#f5f4f0] font-semibold">{p.title}</td>
                <td className="py-3 px-4 text-[#d4d0c8]">{p.author}</td>
                <td className="py-3 px-4 text-[#a5c8ff] font-bold">{p.loans}</td>
              </tr>
            ))}
          </ReportTable>
        </ReportCard>

        <ReportCard className="lg:col-span-5" title="Collection by category" subtitle="Titles and copies per category" icon="category" accent="#3371bb">
          <ReportTable headers={["Category", "Titles", "Copies"]} empty={report.byCategory.length === 0} emptyText="No books yet.">
            {report.byCategory.map((c) => (
              <tr key={c.category} className="hover:bg-[#141516]/40 transition-colors">
                <td className="py-3 px-4 text-[#f5f4f0] font-semibold">{c.category}</td>
                <td className="py-3 px-4 text-[#d4d0c8]">{c.titles}</td>
                <td className="py-3 px-4 text-[#d4d0c8]">{c.copies}</td>
              </tr>
            ))}
          </ReportTable>
        </ReportCard>
      </div>
    </div>
  );
}

function ReportCard({ title, subtitle, icon, accent, className, children }: { title: string; subtitle: string; icon: string; accent: string; className?: string; children: ReactNode }) {
  return (
    <section className={`${className ?? ""} backdrop-blur-xl bg-[#2c2e32]/75 border border-[#7f403c]/35 rounded-2xl p-6 shadow-xl relative overflow-hidden`}>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#e6453c]/40 via-[#e6453c] to-[#e6453c]/20" style={{ background: `linear-gradient(to right, ${accent}66, ${accent}, ${accent}33)` }} />
      <div className="flex items-center gap-3 pb-4 mb-3 border-b border-white/10">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}26`, border: `1px solid ${accent}4d`, color: accent }}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        <div>
          <h3 className="text-lg font-headline-sm font-bold text-[#f5f4f0]">{title}</h3>
          <p className="text-xs text-[#f5f4f0]/60">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ReportTable({ headers, empty, emptyText, children }: { headers: string[]; empty: boolean; emptyText: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-[#141516]/60 text-xs uppercase tracking-wider text-[#f5f4f0]/60 font-semibold border-y border-white/5 font-label-caps">
            {headers.map((h) => <th key={h} className="py-3 px-4">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {empty ? (
            <tr><td colSpan={headers.length} className="py-6 px-4 text-center text-slate-400">{emptyText}</td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}
