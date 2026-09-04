"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const EARLY_ACCESS_PASSWORD = "thesearemine";
const EARLY_ACCESS_KEY = "stream-starters-hitter-rankings-access";

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
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function openEarlyAccess() {
    setPassword("");
    setPasswordError("");
    setShowPassword(true);
  }

  function closeEarlyAccess() {
    setPassword("");
    setPasswordError("");
    setShowPassword(false);
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password === EARLY_ACCESS_PASSWORD) {
      localStorage.setItem(EARLY_ACCESS_KEY, "granted");

      setShowPassword(false);
      setPassword("");
      setPasswordError("");

      router.push("/baseball/hitters/rankings");
      return;
    }

    setPasswordError("Incorrect password.");
  }

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
                Pitcher and hitter tools built around visual percentile grades
                and quick fantasy decisions.
              </p>
            </div>

            <div className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              Live Google Sheets Data
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* PITCHER */}
            <Link
              href="/baseball/pitchers"
              className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-52 overflow-hidden md:hidden">
                <img
                  src="/baseball-pitcher.png"
                  alt="Pitcher matchup tool"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
              </div>

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
                  <span className="transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </Link>

            {/* HITTER */}
            <Link
              href="/baseball/hitters"
              className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-52 overflow-hidden md:hidden">
                <img
                  src="/baseball-hitter.png"
                  alt="Hitter performance tool"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
              </div>

              <div className="absolute inset-y-0 left-0 hidden w-[35%] overflow-hidden md:block">
                <img
                  src="/baseball-hitter.png"
                  alt="Hitter performance tool"
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
                  <span className="transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* HITTER RANKINGS COMING SOON */}
          <div className="relative mt-6 overflow-hidden rounded-[30px] border border-violet-200 bg-slate-950 shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.24),transparent_42%)]" />

            <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-300">
                    Coming Soon
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                    🔒 Early Access
                  </div>
                </div>

                <h3 className="mt-4 text-3xl font-black tracking-tight text-white">
                  Hitter 1v1 Rankings
                </h3>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                  Build your own hitter rankings through head-to-head choices.
                  Compare full player profiles, percentile grades, position
                  groups, and watch Elo rankings evolve with every pick.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    "1v1 Comparisons",
                    "Elo Rankings",
                    "Position Pools",
                    "Percentile Profiles",
                  ].map((feature) => (
                    <span
                      key={feature}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div className="lg:min-w-[210px]">
                <button
                  type="button"
                  onClick={openEarlyAccess}
                  className="w-full rounded-2xl bg-violet-600 px-6 py-4 text-sm font-black text-white shadow-lg transition hover:bg-violet-500"
                >
                  🔒 Early Access
                </button>

                <div className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Password Required
                </div>
              </div>
            </div>
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
              Matchup analysis and player profiles built for faster weekly
              fantasy decisions.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* POSITION MATCHUP */}
            <Link
              href="/football"
              className="group overflow-hidden rounded-[28px] border border-emerald-400/20 bg-slate-950 transition hover:-translate-y-1 hover:border-emerald-400/40"
            >
              <div className="relative h-52 overflow-hidden">
                <img
                  src="/football-player.png"
                  alt="Football position matchup tool"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                <div className="absolute left-4 top-4 rounded-full border border-emerald-400/30 bg-slate-950/70 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
                  Live
                </div>
              </div>

              <div className="p-6">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-400">
                  Matchups
                </div>

                <h3 className="mt-2 text-2xl font-black text-white">
                  Position Matchup Tool
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Compare QB, RB, WR and TE matchups against opposing defenses.
                </p>

                <div className="mt-5 text-sm font-black text-emerald-300">
                  Open Tool →
                </div>
              </div>
            </Link>

            {/* RB PROFILE */}
            <Link
              href="/football/rb"
              className="group overflow-hidden rounded-[28px] border border-sky-400/20 bg-slate-950 transition hover:-translate-y-1 hover:border-sky-400/40"
            >
              <div className="relative h-52 overflow-hidden">
                <img
                  src="/rb-profile.png"
                  alt="Running back profile tool"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                <div className="absolute left-4 top-4 rounded-full border border-sky-400/30 bg-slate-950/70 px-3 py-1 text-xs font-black uppercase tracking-wider text-sky-300">
                  Live
                </div>
              </div>

              <div className="p-6">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-sky-400">
                  RB Analysis
                </div>

                <h3 className="mt-2 text-2xl font-black text-white">
                  RB Profile Tool
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Rushing, receiving and opportunity profiles with percentile
                  component grades.
                </p>

                <div className="mt-5 text-sm font-black text-sky-300">
                  Open Tool →
                </div>
              </div>
            </Link>

            {/* RB MATCHUP */}
            <Link
              href="/football/rb/matchup"
              className="group overflow-hidden rounded-[28px] border border-violet-400/20 bg-slate-950 transition hover:-translate-y-1 hover:border-violet-400/40"
            >
              <div className="relative h-52 overflow-hidden">
                <img
                  src="/banner-football.png"
                  alt="Running back matchup tool"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                <div className="absolute left-4 top-4 rounded-full border border-violet-400/30 bg-slate-950/70 px-3 py-1 text-xs font-black uppercase tracking-wider text-violet-300">
                  Live
                </div>
              </div>

              <div className="p-6">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-violet-400">
                  RB Matchups
                </div>

                <h3 className="mt-2 text-2xl font-black text-white">
                  RB Matchup Tool
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  View an RB&apos;s profile alongside the opposing defense&apos;s
                  matchup grade.
                </p>

                <div className="mt-5 text-sm font-black text-violet-300">
                  Open Tool →
                </div>
              </div>
            </Link>
          </div>
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

      {/* EARLY ACCESS PASSWORD MODAL */}
      {showPassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEarlyAccess();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-violet-300/30 bg-white shadow-2xl">
            <div className="bg-slate-950 px-6 py-6 text-white">
              <div className="inline-flex rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
                Coming Soon
              </div>

              <h2 className="mt-4 text-2xl font-black">
                Hitter Rankings Early Access
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter the early-access password to open the Hitter 1v1 Rankings
                tool.
              </p>
            </div>

            <form onSubmit={submitPassword} className="p-6">
              <label
                htmlFor="rankings-password"
                className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500"
              >
                Password
              </label>

              <input
                id="rankings-password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordError("");
                }}
                autoFocus
                placeholder="Enter password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />

              {passwordError && (
                <div className="mt-2 text-sm font-bold text-red-600">
                  {passwordError}
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeEarlyAccess}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500"
                >
                  Unlock Tool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}