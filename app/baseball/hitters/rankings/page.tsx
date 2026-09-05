"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMoQ6GKabXGL5IlKEQDJQOu3YwvnHkVl_SlSA2E3zBKUmA7hsX-a8yQW8wPmkuU5g0R3CZv9x4aGvj/pub?gid=842366536&single=true&output=csv";

const MIN_PA = 50;
const K_FACTOR = 32;

const MATCHUP_POOLS = ["All", "C", "1B", "2B", "3B", "SS", "OF", "DH", "2B/SS", "1B/3B"] as const;
type MatchupPool = (typeof MATCHUP_POOLS)[number];

type StatKey =
  | "BB%"
  | "K%"
  | "Z-Swing%"
  | "O-Swing%"
  | "Z-O"
  | "xBA"
  | "SqUpSw%"
  | "Z-Contact%"
  | "HR"
  | "HR%"
  | "EV90"
  | "xwOBA"
  | "wOBA"
  | "SB"
  | "Team R/G";

type Hitter = {
  Name: string;
  Team: string;
  Pos: string;
  "Value": number;
  PA: number;
  "BB%": number;
  "K%": number;
  xBA: number;
  "Z-Contact%": number;
  "SqUpSw%": number;
  HR: number;
  "HR%": number;
  EV90: number;
  "Z-Swing%": number;
  "O-Swing%": number;
  "Z-O": number;
  wOBA: number;
  xwOBA: number;
  SB: number;
  "Team R/G": number;
};

type RatingRow = {
  player_name: string;
  elo: number;
  wins: number;
  losses: number;
  comparisons: number;
  updated_at?: string;
};

type HistoryRow = {
  id?: number;
  winner: string;
  loser: string;
  winner_before: number;
  loser_before: number;
  winner_after: number;
  loser_after: number;
  created_at?: string;
};

type JoinedHitter = Hitter & {
  elo: number;
  wins: number;
  losses: number;
  comparisons: number;
};

type PercentileMap = Record<string, number>;

const STAT_GROUPS: {
  title: string;
  subtitle: string;
  stats: StatKey[];
}[] = [
  {
    title: "Plate Discipline",
    subtitle: "Swing decisions, zone aggression and strikeout control",
    stats: ["BB%", "K%", "Z-Swing%", "O-Swing%", "Z-O"],
  },
  {
    title: "Contact Quality",
    subtitle: "Expected average, contact ability and quality of contact",
    stats: ["xBA", "SqUpSw%", "Z-Contact%"],
  },
  {
    title: "Power",
    subtitle: "Home-run production and high-end exit velocity",
    stats: ["HR", "HR%", "EV90"],
  },
  {
    title: "Production",
    subtitle: "Overall offensive value, speed and team scoring environment",
    stats: ["xwOBA", "wOBA", "SB", "Team R/G"],
  },
];

const LOWER_BETTER = new Set<StatKey>(["K%", "O-Swing%"]);

const TEAM_THEMES: Record<
  string,
  { primary: string; secondary: string; accent?: string }
> = {
  ARI: { primary: "#A71930", secondary: "#E3D4AD" },
  ATL: { primary: "#CE1141", secondary: "#13274F" },
  BAL: { primary: "#DF4601", secondary: "#000000" },
  BOS: { primary: "#BD3039", secondary: "#0C2340" },
  CHC: { primary: "#0E3386", secondary: "#CC3433" },
  CHW: { primary: "#27251F", secondary: "#C4CED4" },
  CIN: { primary: "#C6011F", secondary: "#000000" },
  CLE: { primary: "#E31937", secondary: "#0C2340" },
  COL: { primary: "#33006F", secondary: "#C4CED4" },
  DET: { primary: "#0C2340", secondary: "#FA4616" },
  HOU: { primary: "#002D62", secondary: "#EB6E1F" },
  KCR: { primary: "#004687", secondary: "#BD9B60" },
  LAA: { primary: "#BA0021", secondary: "#003263" },
  LAD: { primary: "#005A9C", secondary: "#A5ACAF" },
  MIA: { primary: "#00A3E0", secondary: "#EF3340" },
  MIL: { primary: "#12284B", secondary: "#FFC52F" },
  MIN: { primary: "#002B5C", secondary: "#D31145" },
  NYM: { primary: "#002D72", secondary: "#FF5910" },
  NYY: { primary: "#132448", secondary: "#C4CED4" },
  ATH: { primary: "#003831", secondary: "#EFB21E" },
  PHI: { primary: "#E81828", secondary: "#002D72" },
  PIT: { primary: "#27251F", secondary: "#FDB827" },
  SDP: { primary: "#2F241D", secondary: "#FFC425" },
  SFG: { primary: "#FD5A1E", secondary: "#27251F" },
  SEA: { primary: "#0C2C56", secondary: "#005C5C" },
  STL: { primary: "#C41E3A", secondary: "#0C2340" },
  TBR: { primary: "#092C5C", secondary: "#8FBCE6" },
  TEX: { primary: "#003278", secondary: "#C0111F" },
  TOR: { primary: "#134A8E", secondary: "#1D2D5C" },
  WSN: { primary: "#AB0003", secondary: "#14225A" },
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/\$/g, "").replace(/,/g, "").replace(/%/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseHittersCsv(text: string): Hitter[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]);

  const idx = (name: string) => headers.indexOf(name);

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);

    const get = (name: string) => cols[idx(name)] ?? "";

    return {
      Name: get("Name"),
      Team: get("Team"),
      Pos: get("Pos"),
      Value: parseNumber(get("$ Value")),
      PA: parseNumber(get("PA")),
      "BB%": parseNumber(get("BB%")),
      "K%": parseNumber(get("K%")),
      xBA: parseNumber(get("xBA")),
      "Z-Contact%": parseNumber(get("Z-Contact%")),
      "SqUpSw%": parseNumber(get("SqUpSw%")),
      HR: parseNumber(get("HR")),
      "HR%": parseNumber(get("HR%")),
      EV90: parseNumber(get("EV90")),
      "Z-Swing%": parseNumber(get("Z-Swing%")),
      "O-Swing%": parseNumber(get("O-Swing%")),
      "Z-O": parseNumber(get("Z-O")),
      wOBA: parseNumber(get("wOBA")),
      xwOBA: parseNumber(get("xwOBA")),
      SB: parseNumber(get("SB")),
      "Team R/G": parseNumber(get("Team R/G")),
    };
  });
}

function hasPositionEligibility(pos: string, pool: MatchupPool): boolean {
  const parts = pos.split("/").map((p) => p.trim().toUpperCase());

  if (pool === "All") return true;
  if (pool === "2B/SS") return parts.includes("2B") || parts.includes("SS");
  if (pool === "1B/3B") return parts.includes("1B") || parts.includes("3B");
  return parts.includes(pool);
}

function expectedScore(a: number, b: number) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function formatDisplayValue(stat: StatKey, value: number) {
  if (["HR", "SB", "PA"].includes(stat)) return Math.round(value).toString();
  if (["xBA", "wOBA", "xwOBA"].includes(stat)) return value.toFixed(3);
  if (stat === "EV90") return value.toFixed(1);
  if (stat === "Team R/G") return value.toFixed(2);
  if (stat.includes("%") || stat === "Z-O") return `${value.toFixed(1)}%`;
  return value.toString();
}

function getTheme(team: string) {
  return (
    TEAM_THEMES[team] || {
      primary: "#0F172A",
      secondary: "#334155",
    }
  );
}

function getPercentiles(players: Hitter[]): Record<string, PercentileMap> {
  const map: Record<string, PercentileMap> = {};

  const stats: StatKey[] = [
    "BB%",
    "K%",
    "Z-Swing%",
    "O-Swing%",
    "Z-O",
    "xBA",
    "SqUpSw%",
    "Z-Contact%",
    "HR",
    "HR%",
    "EV90",
    "xwOBA",
    "wOBA",
    "SB",
    "Team R/G",
  ];

  stats.forEach((stat) => {
    const values = players
      .map((p) => Number(p[stat] ?? 0))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);

    map[stat] = {};

    players.forEach((p) => {
      const value = Number(p[stat] ?? 0);
      const lessOrEqual = values.filter((v) => v <= value).length;
      const pct = values.length ? Math.round((lessOrEqual / values.length) * 100) : 50;
      map[stat][p.Name] = pct;
    });
  });

  return map;
}

function percentileStyle(rawPercentile: number, stat: StatKey) {
  const betterPercentile = LOWER_BETTER.has(stat) ? 100 - rawPercentile : rawPercentile;
  const intensity = Math.abs(betterPercentile - 50) / 50;

  const red = { r: 239, g: 68, b: 68 };
  const blue = { r: 59, g: 130, b: 246 };
  const white = { r: 255, g: 255, b: 255 };

  const source = betterPercentile >= 50 ? red : blue;

  const r = Math.round(white.r + (source.r - white.r) * intensity);
  const g = Math.round(white.g + (source.g - white.g) * intensity);
  const b = Math.round(white.b + (source.b - white.b) * intensity);

  const textColor = intensity > 0.55 ? "#FFFFFF" : "#111827";

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
    border: "1px solid rgba(15,23,42,0.08)",
  };
}

function StatChip({
  label,
  value,
  percentile,
  stat,
}: {
  label: string;
  value: string;
  percentile: number;
  stat: StatKey;
}) {
  return (
    <div
      className="rounded-xl px-3 py-3 text-center shadow-sm"
      style={percentileStyle(percentile, stat)}
    >
      <div className="text-[10px] font-black uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-wide opacity-80">
        P{percentile}
      </div>
    </div>
  );
}

function HitterCard({
  hitter,
  percentiles,
  side,
  onChoose,
}: {
  hitter: JoinedHitter;
  percentiles: Record<string, PercentileMap>;
  side: "left" | "right";
  onChoose: () => void;
}) {
  const theme = getTheme(hitter.Team);

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-sm">
      <div
        className="border-b border-slate-300 px-5 py-5 text-white"
        style={{
          background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
        }}
      >
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/80">
              {hitter.Team} • {hitter.Pos}
            </div>
            <h2 className="mt-1 text-5xl font-black leading-none">{hitter.Name}</h2>
          </div>

          <div className="min-w-[92px] rounded-2xl bg-black/15 px-4 py-3 text-center backdrop-blur-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
              Elo
            </div>
            <div className="text-4xl font-black leading-none">{Math.round(hitter.elo)}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl bg-black/15 px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-white/70">
              $ Value
            </div>
            <div className="mt-1 text-2xl font-black">
              {hitter.Value >= 0 ? `$${hitter.Value.toFixed(2)}` : `-$${Math.abs(hitter.Value).toFixed(2)}`}
            </div>
          </div>
          <div className="rounded-xl bg-black/15 px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-white/70">PA</div>
            <div className="mt-1 text-2xl font-black">{Math.round(hitter.PA)}</div>
          </div>
          <div className="rounded-xl bg-black/15 px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-white/70">
              Record
            </div>
            <div className="mt-1 text-2xl font-black">
              {hitter.wins}-{hitter.losses}
            </div>
          </div>
          <div className="rounded-xl bg-black/15 px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-white/70">
              Comparisons
            </div>
            <div className="mt-1 text-2xl font-black">{hitter.comparisons}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {STAT_GROUPS.map((group) => (
          <div key={group.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 border-l-4 border-slate-900 pl-3">
              <div className="text-2xl font-black uppercase tracking-tight text-slate-900">
                {group.title}
              </div>
              <div className="text-xs font-semibold text-slate-500">{group.subtitle}</div>
            </div>

            <div
              className={`grid gap-2 ${
                group.stats.length === 5
                  ? "grid-cols-5"
                  : group.stats.length === 4
                  ? "grid-cols-4"
                  : "grid-cols-3"
              }`}
            >
              {group.stats.map((stat) => (
                <StatChip
                  key={`${hitter.Name}-${stat}`}
                  label={stat}
                  value={formatDisplayValue(stat, hitter[stat])}
                  percentile={percentiles[stat]?.[hitter.Name] ?? 50}
                  stat={stat}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onChoose}
        className="w-full border-t border-slate-300 px-6 py-4 text-2xl font-black text-white transition hover:brightness-110"
        style={{
          background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
        }}
      >
        Choose {hitter.Name}
      </button>
    </div>
  );
}

export default function HitterRankingsPage() {
  const [tab, setTab] = useState<"compare" | "rankings" | "history">("compare");
  const [rawHitters, setRawHitters] = useState<Hitter[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [matchupPool, setMatchupPool] = useState<MatchupPool>("All");
  const [pair, setPair] = useState<[string, string] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const loadApiState = useCallback(async () => {
    try {
      const res = await fetch("/api/hitter-rankings", { cache: "no-store" });
      const json = await res.json();
      setRatings(Array.isArray(json.ratings) ? json.ratings : []);
      setHistory(Array.isArray(json.history) ? json.history : []);
    } catch (error) {
      console.error("Unable to load hitter rankings:", error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [csvRes] = await Promise.all([fetch(CSV_URL, { cache: "no-store" })]);
      const csvText = await csvRes.text();
      const parsed = parseHittersCsv(csvText).filter((p) => p.Name && p.PA >= MIN_PA);
      setRawHitters(parsed);
      await loadApiState();
    } catch (error) {
      console.error(error);
      setMessage("Unable to load hitter rankings.");
    } finally {
      setLoading(false);
    }
  }, [loadApiState]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const percentiles = useMemo(() => getPercentiles(rawHitters), [rawHitters]);

  const joinedHitters = useMemo<JoinedHitter[]>(() => {
    const ratingsMap = new Map(ratings.map((r) => [r.player_name, r]));
    return rawHitters.map((h) => {
      const rating = ratingsMap.get(h.Name);
      return {
        ...h,
        elo: rating?.elo ?? 1500,
        wins: rating?.wins ?? 0,
        losses: rating?.losses ?? 0,
        comparisons: rating?.comparisons ?? 0,
      };
    });
  }, [rawHitters, ratings]);

  const eligibleHitters = useMemo(() => {
    return joinedHitters.filter((h) => hasPositionEligibility(h.Pos, matchupPool));
  }, [joinedHitters, matchupPool]);

  const totalComparisons = history.length;

  const pickRandomPair = useCallback(
    (poolPlayers: JoinedHitter[], previous?: [string, string] | null): [string, string] | null => {
      if (poolPlayers.length < 2) return null;

      const names = poolPlayers.map((p) => p.Name);
      for (let tries = 0; tries < 20; tries++) {
        const i = Math.floor(Math.random() * names.length);
        let j = Math.floor(Math.random() * names.length);
        while (j === i) {
          j = Math.floor(Math.random() * names.length);
        }
        const candidate: [string, string] = [names[i], names[j]];
        if (!previous) return candidate;
        if (
          candidate[0] !== previous[0] ||
          candidate[1] !== previous[1]
        ) {
          return candidate;
        }
      }

      return [names[0], names[1]];
    },
    []
  );

  useEffect(() => {
    setPair((prev) => pickRandomPair(eligibleHitters, prev));
  }, [eligibleHitters, pickRandomPair]);

  const leftHitter = useMemo(
    () => joinedHitters.find((h) => h.Name === pair?.[0]) ?? null,
    [joinedHitters, pair]
  );
  const rightHitter = useMemo(
    () => joinedHitters.find((h) => h.Name === pair?.[1]) ?? null,
    [joinedHitters, pair]
  );

  const changeMatchupPool = (pool: MatchupPool) => {
    setMatchupPool(pool);
    setPair(null);
  };

  const skipMatchup = () => {
    setPair((prev) => pickRandomPair(eligibleHitters, prev));
  };

  const recordPick = async (winner: JoinedHitter, loser: JoinedHitter) => {
    setSubmitting(true);
    setMessage("");

    try {
      const winnerExpected = expectedScore(winner.elo, loser.elo);
      const loserExpected = expectedScore(loser.elo, winner.elo);

      const winnerAfter = Math.round(winner.elo + K_FACTOR * (1 - winnerExpected));
      const loserAfter = Math.round(loser.elo + K_FACTOR * (0 - loserExpected));

      const res = await fetch("/api/hitter-rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winner: winner.Name,
          loser: loser.Name,
          winner_before: winner.elo,
          loser_before: loser.elo,
          winner_after: winnerAfter,
          loser_after: loserAfter,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save comparison");
      }

      await loadApiState();
      setPair((prev) => pickRandomPair(eligibleHitters, prev));
    } catch (error) {
      console.error(error);
      setMessage("Failed to save comparison.");
    } finally {
      setSubmitting(false);
    }
  };

  const undoLastPick = async () => {
    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/hitter-rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo" }),
      });

      if (!res.ok) {
        throw new Error("Failed to undo last pick");
      }

      await loadApiState();
    } catch (error) {
      console.error(error);
      setMessage("Failed to undo last pick.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = async () => {
    if (!window.confirm("Reset all cloud-synced hitter rankings and history?")) return;

    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/hitter-rankings", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to reset rankings");
      }

      await loadApiState();
      setPair((prev) => pickRandomPair(eligibleHitters, prev));
    } catch (error) {
      console.error(error);
      setMessage("Failed to reset rankings.");
    } finally {
      setSubmitting(false);
    }
  };

  const rankingRows = useMemo(() => {
    return [...eligibleHitters].sort((a, b) => {
      if (b.elo !== a.elo) return b.elo - a.elo;
      return b.comparisons - a.comparisons;
    });
  }, [eligibleHitters]);

  return (
    <main className="min-h-screen bg-[#eef3f8] px-6 py-6 text-slate-900">
      <div className="mx-auto max-w-[1500px]">
        <div className="rounded-[30px] border border-sky-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                Stream Starters • Fantasy Baseball
              </div>
              <h1 className="mt-1 text-5xl font-black tracking-tight text-slate-900">
                Hitter 1v1 Rankings
              </h1>
              <p className="mt-1 text-lg font-semibold text-slate-500">
                Cloud-synced Elo rankings • Minimum {MIN_PA} PA
              </p>
            </div>

            <Link
              href="/"
              className="rounded-full border border-sky-200 px-5 py-2 text-sm font-black text-blue-700 transition hover:bg-sky-50"
            >
              ← Home
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "compare", label: "Compare" },
              { key: "rankings", label: "Rankings" },
              { key: "history", label: "History" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key as typeof tab)}
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  tab === item.key
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={undoLastPick}
              disabled={submitting || history.length === 0}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-40"
            >
              Undo Last Pick
            </button>

            <button
              onClick={resetAll}
              disabled={submitting}
              className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-black text-red-500 disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-lg font-semibold text-slate-500">
            Loading hitter rankings…
          </div>
        ) : (
          <>
            {tab === "compare" && (
              <>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
                    <div className="flex-1">
                      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        Matchup Pool
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {MATCHUP_POOLS.map((pool) => (
                          <button
                            key={pool}
                            onClick={() => changeMatchupPool(pool)}
                            className={`rounded-full px-4 py-2 text-sm font-black ${
                              matchupPool === pool
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {pool}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 text-xs font-semibold text-slate-500">
                        Minimum {MIN_PA} PA.{" "}
                        {matchupPool === "All"
                          ? "Matchups can include any eligible hitter."
                          : matchupPool === "2B/SS"
                          ? "Only hitters eligible at 2B or SS are included."
                          : matchupPool === "1B/3B"
                          ? "Only hitters eligible at 1B or 3B are included."
                          : `Only hitters eligible at ${matchupPool} are included.`}
                      </div>
                    </div>

                    <div className="flex min-w-[280px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-8 py-4">
                      <div className="text-center">
                        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Total Comparisons
                        </div>
                        <div className="mt-1 text-6xl font-black leading-none text-slate-900">
                          {totalComparisons.toLocaleString()}
                        </div>
                        <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Cloud Synced
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {leftHitter && rightHitter ? (
                  <>
                    <div className="mt-4 text-center text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                      Who would you rather have?
                    </div>

                    <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-5">
                      <HitterCard
                        hitter={leftHitter}
                        percentiles={percentiles}
                        side="left"
                        onChoose={() => recordPick(leftHitter, rightHitter)}
                      />

                      <div className="sticky top-4 flex flex-col items-center gap-3 pt-10">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-2xl font-black text-white shadow-sm">
                          VS
                        </div>
                        <button
                          onClick={skipMatchup}
                          disabled={submitting}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm disabled:opacity-40"
                        >
                          Skip
                        </button>
                      </div>

                      <HitterCard
                        hitter={rightHitter}
                        percentiles={percentiles}
                        side="right"
                        onChoose={() => recordPick(rightHitter, leftHitter)}
                      />
                    </div>

                    <div className="mt-4 flex justify-center">
                      <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500">
                        Percentile colors: <span className="font-black text-blue-600">Blue = Worse</span> •{" "}
                        <span className="font-black text-slate-700">White = Average</span> •{" "}
                        <span className="font-black text-red-500">Red = Better</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-lg font-semibold text-slate-500">
                    Not enough qualified hitters in this pool for a matchup.
                  </div>
                )}
              </>
            )}

            {tab === "rankings" && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Rankings
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {matchupPool} Rankings
                    </h2>
                  </div>
                  <div className="text-sm font-semibold text-slate-500">
                    {rankingRows.length} hitters
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3">Pos</th>
                        <th className="px-4 py-3">Elo</th>
                        <th className="px-4 py-3">Record</th>
                        <th className="px-4 py-3">Comparisons</th>
                        <th className="px-4 py-3">$ Value</th>
                        <th className="px-4 py-3">PA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingRows.map((h, idx) => (
                        <tr key={h.Name} className="border-t border-slate-200 text-sm">
                          <td className="px-4 py-3 font-black">{idx + 1}</td>
                          <td className="px-4 py-3 font-black text-slate-900">{h.Name}</td>
                          <td className="px-4 py-3">{h.Team}</td>
                          <td className="px-4 py-3">{h.Pos}</td>
                          <td className="px-4 py-3 font-black">{Math.round(h.elo)}</td>
                          <td className="px-4 py-3">
                            {h.wins}-{h.losses}
                          </td>
                          <td className="px-4 py-3">{h.comparisons}</td>
                          <td className="px-4 py-3">
                            {h.Value >= 0 ? `$${h.Value.toFixed(2)}` : `-$${Math.abs(h.Value).toFixed(2)}`}
                          </td>
                          <td className="px-4 py-3">{Math.round(h.PA)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      History
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">
                      Recent Comparisons
                    </h2>
                  </div>
                  <div className="text-sm font-semibold text-slate-500">
                    {history.length.toLocaleString()} total
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-lg font-semibold text-slate-500">
                    No comparisons yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item, idx) => (
                      <div
                        key={item.id ?? `${item.winner}-${item.loser}-${idx}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                              Comparison #{history.length - idx}
                            </div>
                            <div className="mt-1 text-xl font-black text-slate-900">
                              {item.winner} over {item.loser}
                            </div>
                          </div>

                          <div className="text-sm font-semibold text-slate-600">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString()
                              : "Saved"}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl bg-white px-3 py-3">
                            <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Winner Elo
                            </div>
                            <div className="mt-1 font-black text-slate-900">
                              {item.winner_before} → {item.winner_after}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-3">
                            <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Loser Elo
                            </div>
                            <div className="mt-1 font-black text-slate-900">
                              {item.loser_before} → {item.loser_after}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}