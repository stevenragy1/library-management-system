import { useCallback, useEffect, useState } from "react";
import { api, Report } from "./api";
import { BooksPage } from "./components/BooksPage";
import { IssuePage } from "./components/IssuePage";
import { MembersTransactionsPage } from "./components/MembersTransactionsPage";
import { ReportsPage } from "./components/ReportsPage";

type Tab = "books" | "issue" | "members" | "reports";

const TABS: { id: Tab; label: string }[] = [
  { id: "books", label: "Books" },
  { id: "issue", label: "Issue" },
  { id: "members", label: "Members & Transactions" },
  { id: "reports", label: "Reports" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("books");
  const [totals, setTotals] = useState<Report["totals"] | null>(null);

  // Header stats refresh after any change. Pages keep their own state, so they are not remounted.
  const refreshTotals = useCallback(() => {
    api.reports().then((r) => setTotals(r.totals)).catch(() => setTotals(null));
  }, []);

  useEffect(refreshTotals, [refreshTotals]);

  return (
    <>
      {/* Ambient glowing orbs behind the glass panels */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-br from-[#e6453c]/20 via-[#75403c]/20 to-transparent blur-[140px] animate-aura-1" />
        <div className="absolute top-[20%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl from-[#3371bb]/25 via-[#141516]/40 to-transparent blur-[140px] animate-aura-2" />
        <div className="absolute -bottom-[20%] left-[20%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-[#e6453c]/15 via-[#3371bb]/15 to-transparent blur-[130px]" />
      </div>

      <header className="fixed top-0 inset-x-0 z-50 bg-[#141516]/80 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.65)]">
        <div className="h-28 max-w-[1100px] mx-auto px-gutter flex flex-col justify-between pt-4 pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-space-sm">
              <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-[#f5f4f0]">
                Library Management
              </h1>
            </div>
            <div className="flex items-center gap-space-xs sm:gap-space-sm flex-wrap">
              {totals && (
                <>
                  <Stat dot="bg-[#e6453c] shadow-[0_0_8px_rgba(230,69,60,0.8)]" label="Titles:" value={totals.titles.toLocaleString()} />
                  <Stat dot="bg-[#3371bb] shadow-[0_0_8px_rgba(51,113,187,0.8)]" label="Available / Total:" value={`${totals.available.toLocaleString()} / ${totals.copies.toLocaleString()}`} />
                  <Stat dot="bg-[#e6453c] shadow-[0_0_8px_rgba(230,69,60,0.8)]" label="On Loan:" value={totals.on_loan.toLocaleString()} />
                </>
              )}
            </div>
          </div>
          <nav className="flex items-center gap-2 -mb-0.5 pb-1 flex-wrap">
            {TABS.map((t) =>
              tab === t.id ? (
                <button
                  key={t.id}
                  aria-current="page"
                  onClick={() => setTab(t.id)}
                  className="px-4 py-1.5 rounded-full font-label-lg backdrop-blur-md transition-all duration-200 select-none bg-[#3371bb] border border-[#3371bb]/60 text-white font-semibold shadow-[0_0_20px_rgba(51,113,187,0.6)]"
                >
                  {t.label}
                </button>
              ) : (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="px-4 py-1.5 rounded-full font-label-lg text-label-lg text-neutral-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] backdrop-blur-md transition-all duration-200 select-none"
                >
                  {t.label}
                </button>
              )
            )}
          </nav>
        </div>
      </header>

      <main className="w-full max-w-[1100px] mx-auto px-gutter pt-40 sm:pt-28 pb-margin-expanded relative">
        {tab === "books" && <BooksPage onChange={refreshTotals} />}
        {tab === "issue" && <IssuePage onChange={refreshTotals} />}
        {tab === "members" && <MembersTransactionsPage onChange={refreshTotals} />}
        {tab === "reports" && <ReportsPage />}
      </main>
    </>
  );
}

function Stat({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 rounded-full bg-[#2c2e32]/70 border border-white/[0.08] backdrop-blur-md shadow-md flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="font-label-sm text-label-sm text-neutral-400 font-medium">{label}</span>
      <span className="font-label-md text-label-md text-[#f5f4f0] font-bold">{value}</span>
    </div>
  );
}
