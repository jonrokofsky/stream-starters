"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const RB_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRoMlTzy9AR2vn-fy2hv-JJUf83oCAyw5nqg7EmRNyxm8PXaE_lsa4jXJu41qJjK6BubYlHMtpo1elk/pub?gid=684746044&single=true&output=csv";

type DataRow = Record<string, string>;

type StatConfig = {
  label: string;
  keys: string[];
  format?: "number" | "decimal" | "percent";
};

const TEAM_CODES: Record<string, string> = {
  "Arizona Cardinals": "ARI",
  "Atlanta Falcons": "ATL",
  "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF",
  "Carolina Panthers": "CAR",
  "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN",
  "Cleveland Browns": "CLE",
  "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN",
  "Detroit Lions": "DET",
  "Green Bay Packers": "GB",
  "Houston Texans": "HOU",
  "Indianapolis Colts": "IND",
  "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC",
  "Las Vegas Raiders": "LV",
  "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR",
  "Miami Dolphins": "MIA",
  "Minnesota Vikings": "MIN",
  "New England Patriots": "NE",
  "New Orleans Saints": "NO",
  "New York Giants": "NYG",
  "New York Jets": "NYJ",
  "Philadelphia Eagles": "PHI",
  "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF",
  "Seattle Seahawks": "SEA",
  "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN",
  "Washington Commanders": "WAS",
};

const TEAM_COLORS: Record<string, [string, string]> = {
  ARI: ["#97233F", "#000000"],
  ATL: ["#A71930", "#000000"],
  BAL: ["#241773", "#000000"],
  BUF: ["#00338D", "#C60C30"],
  CAR: ["#0085CA", "#101820"],
  CHI: ["#0B162A", "#C83803"],
  CIN: ["#FB4F14", "#000000"],
  CLE: ["#311D00", "#FF3C00"],
  DAL: ["#003594", "#869397"],
  DEN: ["#FB4F14", "#002244"],
  DET: ["#0076B6", "#B0B7BC"],
  GB: ["#203731", "#FFB612"],
  HOU: ["#03202F", "#A71930"],
  IND: ["#002C5F", "#A2AAAD"],
  JAX: ["#006778", "#D7A22A"],
  KC: ["#E31837", "#FFB81C"],
  LV: ["#000000", "#A5ACAF"],
  LAC: ["#0080C6", "#FFC20E"],
  LAR: ["#003594", "#FFA300"],
  MIA: ["#008E97", "#FC4C02"],
  MIN: ["#4F2683", "#FFC62F"],
  NE: ["#002244", "#C60C30"],
  NO: ["#D3BC8D", "#101820"],
  NYG: ["#0B2265", "#A71930"],
  NYJ: ["#125740", "#000000"],
  PHI: ["#004C54", "#A5ACAF"],
  PIT: ["#FFB612", "#101820"],
  SEA: ["#002244", "#69BE28"],
  SF: ["#AA0000", "#B3995D"],
  TB: ["#D50A0A", "#34302B"],
  TEN: ["#0C2340", "#4B92DB"],
  WAS: ["#5A1414", "#FFB612"],
};

const RUSHING_STATS: StatConfig[] = [
  {
    label: "Rush Gain Profile",
    keys: ["Rush Gain Profile"],
    format: "number",
  },
  {
    label: "Rush Yds/G",
    keys: ["RuYds/G"],
    format: "decimal",
  },
  {
    label: "Yds/Rush",
    keys: ["RuYds/Rush"],
    format: "decimal",
  },
  {
    label: "1+ Rush %",
    keys: ["1+ RuYd%"],
    format: "percent",
  },
  {
    label: "3+ Rush %",
    keys: ["3+ RuYd%"],
    format: "percent",
  },
  {
    label: "5+ Rush %",
    keys: ["5+ RuYd%"],
    format: "percent",
  },
  {
    label: "10+ Rush %",
    keys: ["10+ RuYd%"],
    format: "percent",
  },
  {
    label: "15+ Rush %",
    keys: ["15+ RuYd%"],
    format: "percent",
  },
  {
    label: "20+ Rush %",
    keys: ["20+ RuYd%"],
    format: "percent",
  },
  {
    label: "30+ Rush %",
    keys: ["30+ RuYd%"],
    format: "percent",
  },
];

const RECEIVING_STATS: StatConfig[] = [
  {
    label: "Targets",
    keys: ["Targets"],
    format: "number",
  },
  {
    label: "Target Share",
    keys: ["Target Share"],
    format: "percent",
  },
  {
    label: "Rec Yds/G",
    keys: ["RecYds/G", "Rec Yds/G"],
    format: "decimal",
  },
  {
    label: "Rec Yds/Tgt",
    keys: ["RecYds/Tgt", "Rec Yds/Tgt"],
    format: "decimal",
  },
  {
    label: "Team Rec Yds %",
    keys: [
      "Team Rec Yards %",
      "Team Rec Yds %",
      "Team Rec Yards%",
    ],
    format: "percent",
  },
];

const OPPORTUNITY_STATS: StatConfig[] = [
  {
    label: "Weighted Opp/G",
    keys: [
      "Weighted Opp./G",
      "Weighted Opp/G",
      "Weighted Opp. /G",
    ],
    format: "decimal",
  },
  {
    label: "Target Share",
    keys: ["Target Share"],
    format: "percent",
  },
  {
    label: "Inside 10 Carry %",
    keys: ["Inside 10 Carry%"],
    format: "percent",
  },
  {
    label: "Inside 5 Carries",
    keys: ["Ins. 5 Carries"],
    format: "number",
  },
  {
    label: "Inside 10 Rec",
    keys: ["Ins. 10 Rec."],
    format: "number",
  },
  {
    label: "Total TD",
    keys: ["Total TD"],
    format: "number",
  },
];

function parseCSV(text: string): DataRow[] {
  const rows: string[][] = [];

  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if (
      (char === "\n" || char === "\r") &&
      !inQuotes
    ) {
      if (char === "\r" && next === "\n") {
        i++;
      }

      row.push(value);

      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) =>
    header.trim()
  );

  return rows.slice(1).map((cells) => {
    const result: DataRow = {};

    headers.forEach((header, index) => {
      result[header] =
        (cells[index] || "").trim();
    });

    return result;
  });
}

function toNumber(value: string | undefined) {
  if (!value) return null;

  const cleaned = value
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  if (!cleaned || cleaned === "-") {
    return 0;
  }

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}

function getValue(
  row: DataRow | undefined,
  keys: string[]
) {
  if (!row) return "";

  for (const key of keys) {
    if (
      row[key] !== undefined &&
      row[key] !== ""
    ) {
      return row[key];
    }
  }

  return "";
}

function teamCode(team: string) {
  return TEAM_CODES[team.trim()] || "";
}

function espnLogo(code: string) {
  const overrides: Record<string, string> = {
    JAX: "jax",
    WAS: "wsh",
    TB: "tb",
  };

  if (!code) return "";

  return `https://a.espncdn.com/i/teamlogos/nfl/500/${
    overrides[code] || code.toLowerCase()
  }.png`;
}

function percentile(
  value: number,
  population: number[]
) {
  if (!population.length) {
    return 50;
  }

  const sorted = [...population].sort(
    (a, b) => a - b
  );

  const below = sorted.filter(
    (item) => item < value
  ).length;

  const equal = sorted.filter(
    (item) => item === value
  ).length;

  const rank =
    below + Math.max(equal - 1, 0) / 2;

  if (sorted.length === 1) {
    return 50;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (rank / (sorted.length - 1)) * 100
    )
  );
}

function percentileStyle(
  percentileValue: number
) {
  if (percentileValue >= 90) {
    return "bg-red-600 text-white border-red-700";
  }

  if (percentileValue >= 75) {
    return "bg-red-400 text-white border-red-500";
  }

  if (percentileValue >= 60) {
    return "bg-red-100 text-red-950 border-red-200";
  }

  if (percentileValue >= 40) {
    return "bg-white text-slate-900 border-slate-200";
  }

  if (percentileValue >= 25) {
    return "bg-blue-100 text-blue-950 border-blue-200";
  }

  if (percentileValue >= 10) {
    return "bg-blue-400 text-white border-blue-500";
  }

  return "bg-blue-700 text-white border-blue-800";
}

function scoreStyle(score: number) {
  return percentileStyle(score);
}

function scoreLabel(score: number) {
  if (score >= 90) return "Elite";
  if (score >= 75) return "Excellent";
  if (score >= 60) return "Above Average";
  if (score >= 40) return "Average";
  if (score >= 25) return "Below Average";
  if (score >= 10) return "Poor";
  return "Very Poor";
}

function formatStatValue(
  raw: string,
  format: StatConfig["format"]
) {
  if (!raw || raw === "-") {
    if (format === "percent") {
      return "0.0%";
    }

    return "0";
  }

  const number = toNumber(raw);

  if (number === null) {
    return raw;
  }

  if (format === "percent") {
    return `${number.toFixed(1)}%`;
  }

  if (format === "decimal") {
    return number.toFixed(1);
  }

  return Math.round(number).toString();
}

function ScoreCard({
  title,
  score,
  subtitle,
}: {
  title: string;
  score: number;
  subtitle: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border shadow-lg ${scoreStyle(
        score
      )}`}
    >
      <div className="p-6">
        <div className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
          {title}
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="text-6xl font-black leading-none">
            {Math.round(score)}
          </div>

          <div className="text-right">
            <div className="text-sm font-black">
              {scoreLabel(score)}
            </div>

            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] opacity-60">
              0–100 Score
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-black/10 pt-4 text-sm font-bold opacity-75">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function ComponentSection({
  title,
  description,
  stats,
  selectedPlayer,
  percentilePool,
  qualified,
}: {
  title: string;
  description: string;
  stats: StatConfig[];
  selectedPlayer: DataRow;
  percentilePool: DataRow[];
  qualified: boolean;
}) {
  return (
    <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-950 px-5 py-4 text-white sm:px-6">
        <div className="text-lg font-black">
          {title}
        </div>

        <div className="mt-1 text-xs font-bold text-slate-400">
          {description}
        </div>
      </div>

      {!qualified && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700">
          Selected RB is below the current rushing-attempt qualification minimum.
        </div>
      )}

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => {
          const rawValue =
            getValue(
              selectedPlayer,
              stat.keys
            );

          const numericValue =
            toNumber(rawValue) ?? 0;

          const population =
            percentilePool
              .map((player) =>
                toNumber(
                  getValue(
                    player,
                    stat.keys
                  )
                )
              )
              .filter(
                (
                  value
                ): value is number =>
                  value !== null
              );

          const pct =
            percentile(
              numericValue,
              population
            );

          return (
            <div
              key={stat.label}
              className={`rounded-2xl border p-4 shadow-sm ${
                qualified
                  ? percentileStyle(pct)
                  : "border-slate-200 bg-white text-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[11px] font-black uppercase tracking-[0.1em] opacity-70">
                  {stat.label}
                </div>

                {qualified && (
                  <div className="shrink-0 rounded-full bg-black/10 px-2 py-1 text-[10px] font-black">
                    P{Math.round(pct)}
                  </div>
                )}
              </div>

              <div className="mt-3 text-3xl font-black">
                {formatStatValue(
                  rawValue,
                  stat.format
                )}
              </div>

              <div className="mt-2 text-xs font-bold opacity-70">
                {qualified
                  ? scoreLabel(pct)
                  : "Below qualification"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function RBPage() {
  const [players, setPlayers] =
    useState<DataRow[]>([]);

  const [
    selectedName,
    setSelectedName,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [
    showSuggestions,
    setShowSuggestions,
  ] = useState(false);

  const [
    minRushAttempts,
    setMinRushAttempts,
  ] = useState(100);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          RB_CSV_URL,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Could not load RB data."
          );
        }

        const text =
          await response.text();

        const rows = parseCSV(text)
          .filter(
            (row) => row["Name"]
          )
          .sort((a, b) =>
            (
              a["Name"] || ""
            ).localeCompare(
              b["Name"] || ""
            )
          );

        setPlayers(rows);

        if (rows.length) {
          setSelectedName(
            rows[0]["Name"]
          );

          setSearch(
            rows[0]["Name"]
          );
        }
      } catch (err) {
        console.error(err);

        setError(
          "Could not load the RB sheet."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredPlayers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return players.slice(0, 10);
      }

      return players
        .filter((player) =>
          (
            player["Name"] || ""
          )
            .toLowerCase()
            .includes(query)
        )
        .slice(0, 10);
    }, [players, search]);

  const selectedPlayer =
    useMemo(
      () =>
        players.find(
          (player) =>
            player["Name"] ===
            selectedName
        ),
      [players, selectedName]
    );

  const percentilePool =
    useMemo(() => {
      return players.filter((player) => {
        const attempts =
          toNumber(
            getValue(
              player,
              ["ATT", "Rush Att"]
            )
          ) ?? 0;

        return attempts >= minRushAttempts;
      });
    }, [players, minRushAttempts]);

  function selectPlayer(
    name: string
  ) {
    setSelectedName(name);
    setSearch(name);
    setShowSuggestions(false);
  }

  const age =
    toNumber(
      getValue(
        selectedPlayer,
        ["2026 Age", "Age"]
      )
    ) ?? 0;

  const rushAttempts =
    toNumber(
      getValue(
        selectedPlayer,
        ["ATT", "Rush Att"]
      )
    ) ?? 0;

  const qualified =
    rushAttempts >= minRushAttempts;

  const rawRushScore =
    toNumber(
      getValue(
        selectedPlayer,
        ["Rush Score"]
      )
    ) ?? 0;

  const ageAdjustedRushScore =
    toNumber(
      getValue(
        selectedPlayer,
        [
          "Age Adjusted Rush Score",
        ]
      )
    ) ?? rawRushScore;

  const recScore =
    toNumber(
      getValue(
        selectedPlayer,
        [
          "Rec Score",
          "Receiving Score",
        ]
      )
    ) ?? 0;

  const opportunityScore =
    toNumber(
      getValue(
        selectedPlayer,
        ["Opportunity Score"]
      )
    ) ?? 0;

  const team =
    getValue(
      selectedPlayer,
      ["Team"]
    );

  const code =
    teamCode(team);

  const colors =
    TEAM_COLORS[code] || [
      "#0F172A",
      "#2563EB",
    ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-100 to-white text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">
              Stream Starters
            </div>

            <div className="mt-1 text-xl font-black">
              Fantasy Football
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/football"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              ← Matchup Tool
            </Link>

            <Link
              href="/"
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Running Back Analysis
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            RB Profile Tool
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Evaluate running backs across rushing, receiving, and fantasy opportunity.
          </p>
        </div>

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 font-bold text-slate-600 shadow-sm">
            Loading RB data...
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 font-bold text-red-700">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          players.length > 0 &&
          selectedPlayer && (
            <>
              <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                      Running Back
                    </label>

                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => {
                            setSearch(
                              e.target.value
                            );

                            setShowSuggestions(
                              true
                            );
                          }}
                          onFocus={(e) => {
                            e.target.select();

                            setShowSuggestions(
                              true
                            );
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              filteredPlayers.length
                            ) {
                              e.preventDefault();

                              selectPlayer(
                                filteredPlayers[0]["Name"]
                              );
                            }

                            if (
                              e.key === "Escape"
                            ) {
                              setShowSuggestions(
                                false
                              );
                            }
                          }}
                          placeholder="Search RB..."
                          autoComplete="off"
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-10 font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        />

                        {search && (
                          <button
                            type="button"
                            onMouseDown={(e) =>
                              e.preventDefault()
                            }
                            onClick={() => {
                              setSearch("");

                              setShowSuggestions(
                                true
                              );
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {showSuggestions && (
                        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
                          {filteredPlayers.length > 0 ? (
                            filteredPlayers.map(
                              (player) => (
                                <button
                                  type="button"
                                  key={
                                    player[
                                      "Name"
                                    ]
                                  }
                                  onMouseDown={(
                                    e
                                  ) =>
                                    e.preventDefault()
                                  }
                                  onClick={() =>
                                    selectPlayer(
                                      player[
                                        "Name"
                                      ]
                                    )
                                  }
                                  className="block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50 last:border-b-0"
                                >
                                  <div className="font-black">
                                    {
                                      player[
                                        "Name"
                                      ]
                                    }
                                  </div>

                                  <div className="mt-1 text-xs font-bold text-slate-500">
                                    {
                                      player[
                                        "Team"
                                      ]
                                    }{" "}
                                    •{" "}
                                    {getValue(
                                      player,
                                      ["ATT"]
                                    ) || "0"}{" "}
                                    ATT
                                  </div>
                                </button>
                              )
                            )
                          ) : (
                            <div className="px-4 py-3 text-sm font-bold text-slate-500">
                              No running backs found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-black text-slate-900">
                          Minimum Rush Attempts
                        </div>

                        <div className="text-xs text-slate-500">
                          Qualification and percentile pool
                        </div>
                      </div>

                      <div className="rounded-lg bg-sky-600 px-3 py-1 text-lg font-black text-white">
                        {minRushAttempts}+
                      </div>
                    </div>

                    <input
                      type="range"
                      min="25"
                      max="300"
                      step="5"
                      value={minRushAttempts}
                      onChange={(e) =>
                        setMinRushAttempts(
                          Number(
                            e.target.value
                          )
                        )
                      }
                      className="w-full cursor-pointer accent-sky-500"
                    />

                    <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
                      <span>25 ATT</span>
                      <span>300 ATT</span>
                    </div>

                    <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                      Percentiles compared against{" "}
                      <span className="font-black text-slate-900">
                        {percentilePool.length} RBs
                      </span>{" "}
                      with at least{" "}
                      <span className="font-black text-slate-900">
                        {minRushAttempts} rushing attempts
                      </span>
                      .
                    </div>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-xl">
                <div
                  className="relative overflow-hidden px-6 py-7 text-white sm:px-8 sm:py-9"
                  style={{
                    background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[0]} 60%, ${colors[1]} 150%)`,
                  }}
                >
                  <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />

                  <div className="relative flex items-center gap-5">
                    {code && (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-xl sm:h-28 sm:w-28">
                        <img
                          src={espnLogo(
                            code
                          )}
                          alt={`${team} logo`}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                        RB Profile
                      </div>

                      <h2 className="mt-1 text-3xl font-black sm:text-4xl">
                        {
                          selectedPlayer[
                            "Name"
                          ]
                        }
                      </h2>

                      <div className="mt-2 text-sm font-bold text-white/80">
                        {team || "—"} • 2026 Age:{" "}
                        <span className="text-white">
                          {age || "—"}
                        </span>{" "}
                        •{" "}
                        <span className="text-white">
                          {Math.round(
                            rushAttempts
                          )}{" "}
                          ATT
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {!qualified && (
                  <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm font-black text-red-700">
                    This RB has {Math.round(
                      rushAttempts
                    )} rushing attempts and is below the current {minRushAttempts} ATT minimum. Raw values are shown, but percentile grades are disabled.
                  </div>
                )}

                <div className="p-5 sm:p-8">
                  <div className="grid gap-5 lg:grid-cols-3">
                    <ScoreCard
                      title="Rushing Score"
                      score={
                        ageAdjustedRushScore
                      }
                      subtitle={`Raw Rush Score: ${Math.round(
                        rawRushScore
                      )} • Age adjusted for 2026`}
                    />

                    <ScoreCard
                      title="Receiving Score"
                      score={recScore}
                      subtitle="Receiving volume, involvement, and efficiency"
                    />

                    <ScoreCard
                      title="Opportunity Score"
                      score={
                        opportunityScore
                      }
                      subtitle="Weighted opportunity, target share, TD production, and scoring-area usage"
                    />
                  </div>

                  <ComponentSection
                    title="Rushing Components"
                    description={`Rush Gain Profile plus production, efficiency, consistency, and explosive rushing gains. Percentiles use ${minRushAttempts}+ ATT RBs.`}
                    stats={
                      RUSHING_STATS
                    }
                    selectedPlayer={
                      selectedPlayer
                    }
                    percentilePool={
                      percentilePool
                    }
                    qualified={
                      qualified
                    }
                  />

                  <ComponentSection
                    title="Receiving Components"
                    description={`Receiving volume, involvement, and efficiency. Percentiles use ${minRushAttempts}+ ATT RBs.`}
                    stats={
                      RECEIVING_STATS
                    }
                    selectedPlayer={
                      selectedPlayer
                    }
                    percentilePool={
                      percentilePool
                    }
                    qualified={
                      qualified
                    }
                  />

                  <ComponentSection
                    title="Opportunity Components"
                    description={`Overall workload, passing involvement, touchdown production, and high-value scoring opportunities. Percentiles use ${minRushAttempts}+ ATT RBs.`}
                    stats={
                      OPPORTUNITY_STATS
                    }
                    selectedPlayer={
                      selectedPlayer
                    }
                    percentilePool={
                      percentilePool
                    }
                    qualified={
                      qualified
                    }
                  />

                  <div className="mt-8">
                    <div className="mx-auto max-w-sm">
                      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Percentile Key
                      </div>

                      <div
                        className="h-4 rounded-full border border-slate-300"
                        style={{
                          background:
                            "linear-gradient(90deg, rgb(58,116,192), white 50%, rgb(220,45,45))",
                        }}
                      />

                      <div className="mt-1 flex justify-between text-xs font-bold text-slate-500">
                        <span>
                          Worse
                        </span>
                        <span>
                          Average
                        </span>
                        <span>
                          Better
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
      </section>
    </main>
  );
}