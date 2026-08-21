import Link from "next/link";

function StreamStartersLogo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl shadow-lg ${
          light ? "bg-white" : "bg-slate-950"
        }`}
      >
        <div className="absolute h-8 w-8 rotate-45 rounded-sm border-2 border-sky-400" />
        <div
          className={`relative text-[11px] font-black tracking-tight ${
            light ? "text-slate-950" : "text-white"
          }`}
        >
          SS
        </div>
      </div>

      <div className="leading-none">
        <div
          className={`text-[11px] font-black tracking-[0.24em] ${
            light ? "text-slate-400" : "text-slate-500"
          }`}
        >
          STREAM
        </div>

        <div
          className={`text-xl font-black tracking-tight ${
            light ? "text-white" : "text-slate-950"
          }`}
        >
          STARTERS
        </div>

        <div className="mt-1 text-[8px] font-bold tracking-[0.22em] text-sky-500">
          FANTASY SPORTS
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* NAV */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <StreamStartersLogo />

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link
              href="/baseball/pitchers"
              className="transition hover:text-sky-600"
            >
              Pitchers
            </Link>

            <Link
              href="/baseball/hitters"
              className="transition hover:text-sky-600"
            >
              Hitters
            </Link>

            <Link
              href="/football"
              className="transition hover:text-sky-600"
            >
              Football
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="overflow-hidden bg-[#020817] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="mb-7">
              <StreamStartersLogo light />
            </div>

            <div className="mb-4 inline-flex w-fit rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-300 sm:text-xs">
              Fantasy Baseball + Football
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">
              Fast matchup tools.
              <span className="mt-2 block text-sky-400">
                Better fantasy decisions.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              Visual percentile grades, opponent trends, roster percentages,
              and quick verdicts without digging through ten different tabs.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/baseball/pitchers"
                className="rounded-xl bg-sky-500 px-5 py-3 text-center text-sm font-black text-white shadow-lg transition hover:bg-sky-400"
              >
                Pitcher Tool
              </Link>

              <Link
                href="/baseball/hitters"
                className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
              >
                Hitter Tool
              </Link>

              <Link
                href="/football"
                className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-center text-sm font-black text-emerald-300 transition hover:bg-emerald-400/20"
              >
                Football Tool
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3 sm:px-4">
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-400 sm:text-xs">
                  Percentile
                </div>
                <div className="mt-1 text-[11px] font-bold text-white sm:text-sm">
                  Grades
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3 sm:px-4">
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-400 sm:text-xs">
                  Matchup
                </div>
                <div className="mt-1 text-[11px] font-bold text-white sm:text-sm">
                  Data
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3 sm:px-4">
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-400 sm:text-xs">
                  Quick
                </div>
                <div className="mt-1 text-[11px] font-bold text-white sm:text-sm">
                  Verdicts
                </div>
              </div>
            </div>
          </div>

          {/* Hero images hidden on very small phones */}
          <div className="hidden min-h-[500px] grid-rows-2 gap-4 sm:grid">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-2xl">
              <img
                src="/banner-pitcher.png"
                alt="Fantasy baseball pitching analysis"
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/90 to-transparent" />

              <div className="absolute bottom-5 left-5">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">
                  Pitching Analysis
                </div>
                <div className="mt-1 text-xl font-black text-white">
                  Matchups at a glance
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-2xl">
              <img
                src="/banner-hitter.png"
                alt="Fantasy baseball hitter analysis"
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/90 to-transparent" />

              <div className="absolute bottom-5 left-5">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">
                  Hitter Analysis
                </div>
                <div className="mt-1 text-xl font-black text-white">
                  Find the favorable spots
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BASEBALL */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                Fantasy Baseball
              </div>

              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Baseball Tools
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Pitcher and hitter matchup tools built around visual percentile
                grades and quick fantasy decisions.
              </p>
            </div>

            <div className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              Live Google Sheets Data
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pitcher */}
            <Link
              href="/baseball/pitchers"
              className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Mobile image */}
              <div className="relative h-52 overflow-hidden md:hidden">
                <img
                  src="/baseball-pitcher.png"
                  alt="Pitcher matchup tool"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
              </div>

              {/* Desktop image */}
              <div className="absolute inset-y-0 left-0 hidden w-[35%] overflow-hidden md:block">
                <img
                  src="/baseball-pitcher.png"
                  alt="Pitcher matchup tool"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
              </div>

              <div className="p-6 md:ml-[35%] md:p-8">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">
                  Pitcher Tool
                </div>

                <h3 className="mt-2 text-2xl font-black tracking-tight">
                  Starting Pitcher Matchups
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Season and recent performance, opponent splits, percentile
                  heat maps, roster percentages, and shareable graphics.
                </p>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-slate-950">
                  Open Pitcher Tool
                  <span className="transition group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>

            {/* Hitter */}
            <Link
              href="/baseball/hitters"
              className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Mobile image */}
              <div className="relative h-52 overflow-hidden md:hidden">
                <img
                  src="/baseball-hitter.png"
                  alt="Hitter matchup tool"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
              </div>

              {/* Desktop image */}
              <div className="absolute inset-y-0 left-0 hidden w-[35%] overflow-hidden md:block">
                <img
                  src="/baseball-hitter.png"
                  alt="Hitter matchup tool"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
              </div>

              <div className="p-6 md:ml-[35%] md:p-8">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                  Hitter Tool
                </div>

                <h3 className="mt-2 text-2xl font-black tracking-tight">
                  Hitter Performance Grades
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Season and Last 30 performance, every key hitting metric,
                  percentile grades, roster percentages, and exportable cards.
                </p>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-slate-950">
                  Open Hitter Tool
                  <span className="transition group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTBALL */}
      <section className="bg-[#06110d]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-8">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
              Fantasy Football
            </div>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Football Tools
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Defense-vs-position matchup analysis for quarterbacks, running
              backs, wide receivers, and tight ends.
            </p>
          </div>

          <Link
            href="/football"
            className="group relative block overflow-hidden rounded-[30px] border border-emerald-400/20 bg-slate-950 shadow-2xl transition hover:-translate-y-1 hover:border-emerald-400/40"
          >
            {/* Mobile */}
            <div className="relative h-60 overflow-hidden md:hidden">
              <img
                src="/banner-football.png"
                alt="Fantasy football position matchup tool"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
            </div>

            {/* Desktop image */}
            <div className="absolute inset-y-0 right-0 hidden w-[50%] md:block">
              <img
                src="/banner-football.png"
                alt="Fantasy football position matchup tool"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/35 to-transparent" />
            </div>

            <div className="relative z-10 p-6 md:w-[58%] md:p-10 lg:p-12">
              <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                Live Now
              </div>

              <h3 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Position Matchup Tool
              </h3>

              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                Select QB, RB, WR, or TE and see how favorable the opposing
                defense has been against that position, including 2025 raw
                percentile grades and 2026 offseason-adjusted matchup grades.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {["QB", "RB", "WR", "TE"].map((position) => (
                  <span
                    key={position}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white"
                  >
                    {position}
                  </span>
                ))}
              </div>

              <div className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg transition group-hover:bg-emerald-400">
                Open Football Tool
                <span className="transition group-hover:translate-x-1">→</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <StreamStartersLogo />

          <div className="text-xs font-bold text-slate-400">
            Stream Starters Fantasy Sports
          </div>
        </div>
      </footer>
    </main>
  );
}