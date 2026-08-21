import Link from "next/link";

function StreamStartersLogo({
  light = false,
}: {
  light?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 400 100"
      className="h-full w-full"
      aria-label="Stream Starters"
    >
      <rect
        x="4"
        y="6"
        width="88"
        height="88"
        rx="22"
        fill={light ? "#FFFFFF" : "#0F172A"}
      />

      <path
        d="M22 63 L38 50 L50 56 L72 33"
        fill="none"
        stroke="#2563EB"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M63 33 H72 V42"
        fill="none"
        stroke="#2563EB"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <text
        x="48"
        y="82"
        textAnchor="middle"
        fill={light ? "#0F172A" : "#FFFFFF"}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="21"
        fontWeight="900"
      >
        SS
      </text>

      <text
        x="112"
        y="43"
        fill={light ? "#FFFFFF" : "#0F172A"}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="28"
        fontWeight="900"
        letterSpacing="1.6"
      >
        STREAM
      </text>

      <text
        x="112"
        y="73"
        fill={light ? "#60A5FA" : "#2563EB"}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="28"
        fontWeight="900"
        letterSpacing="1.6"
      >
        STARTERS
      </text>

      <text
        x="114"
        y="91"
        fill={light ? "#CBD5E1" : "#64748B"}
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="9"
        fontWeight="700"
        letterSpacing="1.4"
      >
        FANTASY SPORTS
      </text>
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">

      {/* NAV */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div className="h-[48px] w-[195px]">
            <StreamStartersLogo />
          </div>

          <div className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link
              href="/baseball/pitchers"
              className="transition hover:text-blue-600"
            >
              Pitchers
            </Link>

            <Link
              href="/baseball/hitters"
              className="transition hover:text-blue-600"
            >
              Hitters
            </Link>

            <span className="text-slate-400">
              Football Soon
            </span>
          </div>

        </div>
      </nav>

      {/* HERO */}
      <section className="bg-[#020817]">
        <div className="mx-auto grid max-w-7xl overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">

          {/* HERO TEXT */}
          <div className="relative flex items-center px-6 py-14 md:px-10 md:py-16 lg:px-12 lg:py-20">

            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(37,99,235,0.22), transparent 40%)",
              }}
            />

            <div className="relative max-w-xl">

              <div className="mb-6 h-[82px] w-[330px] max-w-full">
                <StreamStartersLogo light />
              </div>

              <div className="mb-5 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                Fantasy Baseball + Football
              </div>

              <h1 className="text-4xl font-black leading-tight text-white md:text-5xl xl:text-6xl">
                Fast matchup tools.
                <br />
                <span className="text-blue-400">
                  Better fantasy decisions.
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-300">
                Visual percentile grades, opponent trends, roster percentages,
                and quick verdicts without digging through ten different tabs.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">

                <Link
                  href="/baseball/pitchers"
                  className="rounded-xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg transition hover:bg-blue-500"
                >
                  Pitcher Tool →
                </Link>

                <Link
                  href="/baseball/hitters"
                  className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-black text-white transition hover:bg-white/20"
                >
                  Hitter Tool →
                </Link>

              </div>

              <div className="mt-9 grid grid-cols-3 gap-3">

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xl font-black text-blue-400">
                    %
                  </div>

                  <div className="mt-1 text-xs font-black uppercase text-white">
                    Percentile
                    <br />
                    Grades
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xl font-black text-cyan-400">
                    VS
                  </div>

                  <div className="mt-1 text-xs font-black uppercase text-white">
                    Matchup
                    <br />
                    Data
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xl font-black text-lime-400">
                    ✓
                  </div>

                  <div className="mt-1 text-xs font-black uppercase text-white">
                    Quick
                    <br />
                    Verdicts
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* HERO IMAGES */}
          <div className="grid min-h-[420px] grid-rows-2 lg:min-h-[620px]">

            <div className="relative overflow-hidden border-b border-blue-400/20">
              <img
                src="/banner-pitcher.png"
                alt="Baseball pitcher"
                className="h-full w-full object-cover object-center"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#020817]/70 via-blue-950/10 to-blue-900/10" />

              <div className="absolute bottom-5 left-5 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white backdrop-blur">
                Pitching Analysis
              </div>
            </div>

            <div className="relative overflow-hidden">
              <img
                src="/banner-hitter.png"
                alt="Baseball hitter"
                className="h-full w-full object-cover object-center"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#020817]/55 via-transparent to-blue-900/10" />

              <div className="absolute bottom-5 left-5 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white backdrop-blur">
                Hitter Analysis
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* BASEBALL */}
      <section className="mx-auto max-w-7xl px-6 py-12">

        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">

          <div>
            <div className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">
              Fantasy Baseball
            </div>

            <h2 className="mt-1 text-3xl font-black">
              Baseball Tools
            </h2>
          </div>

          <div className="w-fit rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-blue-700">
            Live Google Sheets Data
          </div>

        </div>

        <div className="grid gap-6 md:grid-cols-2">

          {/* PITCHER CARD */}
          <Link
            href="/baseball/pitchers"
            className="group relative min-h-[270px] overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-lg transition duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl"
          >

            <div className="absolute inset-y-0 left-0 w-[42%] overflow-hidden">
              <img
                src="/baseball-pitcher.png"
                alt="Pitcher"
                className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/15 to-white" />
            </div>

            <div className="relative ml-[35%] flex min-h-[270px] flex-col justify-center p-7">

              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black text-white shadow-md">
                P
              </div>

              <h3 className="text-2xl font-black">
                Pitcher Matchup Tool
              </h3>

              <p className="mt-2 leading-relaxed text-slate-600">
                Compare Season and Last 30 performance with opponent tendencies,
                roster rates, and streaming verdicts.
              </p>

              <div className="mt-5 font-black text-blue-600">
                Open Pitcher Tool →
              </div>

            </div>

          </Link>

          {/* HITTER CARD */}
          <Link
            href="/baseball/hitters"
            className="group relative min-h-[270px] overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-lg transition duration-200 hover:-translate-y-1 hover:border-cyan-400 hover:shadow-xl"
          >

            <div className="absolute inset-y-0 left-0 w-[42%] overflow-hidden">
              <img
                src="/baseball-hitter.png"
                alt="Hitter"
                className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/15 to-white" />
            </div>

            <div className="relative ml-[35%] flex min-h-[270px] flex-col justify-center p-7">

              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500 text-xl font-black text-white shadow-md">
                H
              </div>

              <h3 className="text-2xl font-black">
                Hitter Matchup Tool
              </h3>

              <p className="mt-2 leading-relaxed text-slate-600">
                Evaluate hitters with Season and Last 30 percentiles, PA
                thresholds, roster rates, and quick verdicts.
              </p>

              <div className="mt-5 font-black text-cyan-600">
                Open Hitter Tool →
              </div>

            </div>

          </Link>

        </div>
      </section>

      {/* FOOTBALL */}
      <section className="mx-auto max-w-7xl px-6 pb-14">

        <div className="mb-5">
          <div className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600">
            Fantasy Football
          </div>

          <h2 className="mt-1 text-3xl font-black">
            Football Tools
          </h2>
        </div>

        <div className="relative min-h-[330px] overflow-hidden rounded-3xl border border-emerald-200 bg-[#06140d] shadow-xl">

          <img
            src="/banner-football.png"
            alt="Football player"
            className="absolute right-0 top-0 h-full w-[58%] object-cover object-top"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#06140d] via-[#06140d]/95 to-transparent" />

          <div className="relative flex min-h-[330px] max-w-2xl flex-col justify-center p-8 md:p-10">

            <div className="mb-4 inline-flex w-fit rounded-full border border-lime-400/30 bg-lime-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-lime-300">
              Coming Soon
            </div>

            <h3 className="text-3xl font-black text-white md:text-4xl">
              Position Matchup Tool
            </h3>

            <p className="mt-3 max-w-xl text-lg leading-relaxed text-slate-300">
              See how defenses perform against QB, RB, WR, and TE using fantasy
              points, yards, touchdowns, and matchup trends.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">

              {["QB", "RB", "WR", "TE"].map(
                (position) => (
                  <div
                    key={position}
                    className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white"
                  >
                    {position}
                  </div>
                )
              )}

            </div>

          </div>

        </div>

      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-7 md:flex-row">

          <div className="h-[44px] w-[175px]">
            <StreamStartersLogo />
          </div>

          <div className="text-sm font-semibold text-slate-500">
            Fantasy matchup tools for faster decisions.
          </div>

        </div>

      </footer>

    </main>
  );
}