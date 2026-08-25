"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { toPng } from "html-to-image";

const HITTER_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMoQ6GKabXGL5IlKEQDJQOu3YwvnHkVl_SlSA2E3zBKUmA7hsX-a8yQW8wPmkuU5g0R3CZv9x4aGvj/pub?gid=1498012080&single=true&output=csv";

type DataRow = Record<string, string>;
type Direction = "higher" | "lower" | "neutral";

type TeamTheme = {
  primary: string;
  secondary: string;
};

const TEAM_THEMES: Record<string, TeamTheme> = {
  ARI: { primary: "#A71930", secondary: "#E3D4AD" },
  ATL: { primary: "#13274F", secondary: "#CE1141" },
  BAL: { primary: "#DF4601", secondary: "#000000" },
  BOS: { primary: "#0C2340", secondary: "#BD3039" },
  CHC: { primary: "#0E3386", secondary: "#CC3433" },
  CHW: { primary: "#27251F", secondary: "#C4CED4" },
  CIN: { primary: "#C6011F", secondary: "#000000" },
  CLE: { primary: "#00385D", secondary: "#E50022" },
  COL: { primary: "#33006F", secondary: "#C4CED4" },
  DET: { primary: "#0C2340", secondary: "#FA4616" },
  HOU: { primary: "#002D62", secondary: "#EB6E1F" },
  KCR: { primary: "#004687", secondary: "#BD9B60" },
  LAA: { primary: "#BA0021", secondary: "#003263" },
  LAD: { primary: "#005A9C", secondary: "#EF3E42" },
  MIA: { primary: "#00A3E0", secondary: "#EF3340" },
  MIL: { primary: "#12284B", secondary: "#FFC52F" },
  MIN: { primary: "#002B5C", secondary: "#D31145" },
  NYM: { primary: "#002D72", secondary: "#FF5910" },
  NYY: { primary: "#0C2340", secondary: "#C4CED4" },
  ATH: { primary: "#003831", secondary: "#EFB21E" },
  PHI: { primary: "#E81828", secondary: "#002D72" },
  PIT: { primary: "#27251F", secondary: "#FDB827" },
  SDP: { primary: "#2F241D", secondary: "#FFC425" },
  SEA: { primary: "#0C2C56", secondary: "#005C5C" },
  SFG: { primary: "#27251F", secondary: "#FD5A1E" },
  STL: { primary: "#C41E3A", secondary: "#0C2340" },
  TBR: { primary: "#092C5C", secondary: "#8FBCE6" },
  TEX: { primary: "#003278", secondary: "#C0111F" },
  TOR: { primary: "#134A8E", secondary: "#E8291C" },
  WSN: { primary: "#AB0003", secondary: "#14225A" },
};

const DEFAULT_THEME = {
  primary: "#0d5a96",
  secondary: "#38bdf8",
};

function StreamStartersLogo() {
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
        fill="#0F172A"
      />

      <path
        d="M22 63 L38 50 L50 56 L72 33"
        fill="none"
        stroke="#38BDF8"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M63 33 H72 V42"
        fill="none"
        stroke="#38BDF8"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <text
        x="48"
        y="82"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="21"
        fontWeight="900"
      >
        SS
      </text>

      <text
        x="112"
        y="43"
        fill="#0F172A"
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
        fill="#475569"
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
        fill="#64748B"
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

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);

  return result.map((value) => value.trim());
}

function parseCSV(text: string): DataRow[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: DataRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function numericValue(value: string | undefined) {
  if (!value) return null;

  const cleaned = value
    .replace(/%/g, "")
    .replace(/,/g, "")
    .trim();

  if (!cleaned) return null;

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function percentileForValue(
  value: number,
  population: number[],
  direction: Direction
) {
  if (direction === "neutral") return 0.5;
  if (!population.length) return 0.5;

  const sorted = [...population].sort((a, b) => a - b);

  const lessOrEqual = sorted.filter(
    (number) => number <= value
  ).length;

  let percentile = lessOrEqual / sorted.length;

  if (direction === "lower") {
    percentile =
      1 - percentile + 1 / sorted.length;
  }

  return Math.max(0, Math.min(1, percentile));
}

function mixColor(
  start: [number, number, number],
  end: [number, number, number],
  amount: number
) {
  const r = Math.round(
    start[0] + (end[0] - start[0]) * amount
  );

  const g = Math.round(
    start[1] + (end[1] - start[1]) * amount
  );

  const b = Math.round(
    start[2] + (end[2] - start[2]) * amount
  );

  return `rgb(${r}, ${g}, ${b})`;
}

function percentileColor(percentile: number) {
  const blue: [number, number, number] = [
    58, 116, 192,
  ];

  const white: [number, number, number] = [
    255, 255, 255,
  ];

  const red: [number, number, number] = [
    220, 45, 45,
  ];

  if (percentile <= 0.5) {
    return mixColor(
      blue,
      white,
      percentile / 0.5
    );
  }

  return mixColor(
    white,
    red,
    (percentile - 0.5) / 0.5
  );
}

function textColor(percentile: number) {
  if (
    percentile < 0.12 ||
    percentile > 0.88
  ) {
    return "#ffffff";
  }

  return "#111827";
}

function getEspnLogoCode(team: string) {
  const overrides: Record<string, string> = {
    CHW: "chw",
    WSN: "wsh",
    KCR: "kc",
    SDP: "sd",
    SFG: "sf",
    TBR: "tb",
  };

  return overrides[team] || team.toLowerCase();
}

function TeamLogo({
  team,
}: {
  team: string;
}) {
  if (!TEAM_THEMES[team]) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-700">
        {team || "MLB"}
      </div>
    );
  }

  const code = getEspnLogoCode(team);

  return (
    <img
      src={`https://a.espncdn.com/i/teamlogos/mlb/500/${code}.png`}
      alt={team}
      className="h-20 w-20 object-contain"
    />
  );
}

function StatCell({
  label,
  value,
  percentile,
  qualified,
  theme,
  neutral = false,
}: {
  label: string;
  value: string | undefined;
  percentile: number;
  qualified: boolean;
  theme: TeamTheme;
  neutral?: boolean;
}) {
  const useNeutral = !qualified || neutral;

  return (
    <div className="min-w-0 border-r border-white/10 last:border-r-0">
      <div
        className="flex h-12 items-center justify-center px-2 text-center text-sm font-black"
        style={{
          backgroundColor: theme.primary,
          color: theme.secondary,
        }}
      >
        {label}
      </div>

      <div
        className="flex min-h-[58px] items-center justify-center px-2 text-center text-base font-black"
        style={{
          backgroundColor: useNeutral
            ? "#ffffff"
            : percentileColor(percentile),

          color: useNeutral
            ? "#111827"
            : textColor(percentile),
        }}
      >
        {qualified ? value || "—" : "—"}
      </div>
    </div>
  );
}

async function waitForImages(
  node: HTMLElement
) {
  const images = Array.from(
    node.querySelectorAll("img")
  );

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }

          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

export default function HittersPage() {
  const graphicRef =
    useRef<HTMLDivElement>(null);

  const [hitters, setHitters] =
    useState<DataRow[]>([]);

  const [
    selectedHitterName,
    setSelectedHitterName,
  ] = useState("");

  const [
    hitterSearch,
    setHitterSearch,
  ] = useState("");

  const [
    showSuggestions,
    setShowSuggestions,
  ] = useState(false);

  const [
    seasonMinPA,
    setSeasonMinPA,
  ] = useState(50);

  const [
    espnRoster,
    setEspnRoster,
  ] = useState("");

  const [
    yahooRoster,
    setYahooRoster,
  ] = useState("");

  const [
    verdictText,
    setVerdictText,
  ] = useState("Start");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [exporting, setExporting] =
    useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const response = await fetch(
          HITTER_CSV_URL,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load hitter data."
          );
        }

        const text = await response.text();

        const rows = parseCSV(text)
          .filter((row) => row["Name"])
          .sort((a, b) =>
            (a["Name"] || "").localeCompare(
              b["Name"] || ""
            )
          );

        setHitters(rows);

        if (rows.length) {
          setSelectedHitterName(
            rows[0]["Name"]
          );

          setHitterSearch(
            rows[0]["Name"]
          );
        }
      } catch (err) {
        console.error(err);

        setError(
          "Could not load hitter data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const selectedHitter =
    useMemo(
      () =>
        hitters.find(
          (hitter) =>
            hitter["Name"] ===
            selectedHitterName
        ),
      [hitters, selectedHitterName]
    );

  const filteredHitters =
    useMemo(() => {
      const query =
        hitterSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return hitters.slice(0, 10);
      }

      return hitters
        .filter((hitter) =>
          (hitter["Name"] || "")
            .toLowerCase()
            .includes(query)
        )
        .slice(0, 10);
    }, [hitters, hitterSearch]);

  const team =
    selectedHitter?.["Team"] || "";

  const hand =
    selectedHitter?.["Hand"] || "";

  const theme =
    TEAM_THEMES[team] ||
    DEFAULT_THEME;

  const seasonPA =
    numericValue(
      selectedHitter?.["Szn PA"]
    );

  const l30PA =
    numericValue(
      selectedHitter?.["L30 PA"]
    );

  const seasonQualified =
    seasonPA !== null &&
    seasonPA >= seasonMinPA;

  const l30Qualified =
    l30PA !== null &&
    l30PA >= 50;

  const directions: Record<
    string,
    Direction
  > = {
    "Szn PA": "neutral",
    "Szn BB%": "higher",
    "Szn K%": "lower",
    "Szn OBP": "higher",
    "Szn SLG": "higher",
    "Szn wRC+": "higher",
    "Szn EV90": "higher",
    "Szn SqUpSw%": "higher",
    "Szn Z-Contact%": "higher",
    "Szn O-Swing%": "lower",
    "Szn SB": "higher",

    "L30 PA": "neutral",
    "L30 BB%": "higher",
    "L30 K%": "lower",
    "L30 OBP": "higher",
    "L30 SLG": "higher",
    "L30 wRC+": "higher",
    "L30 EV90": "higher",
    "L30 SqUpSw%": "higher",
    "L30 Z-Contact%": "higher",
    "L30 O-Swing%": "lower",
    "L30 SB": "higher",
  };

  const seasonStats = [
    { label: "PA", key: "Szn PA" },
    { label: "BB%", key: "Szn BB%" },
    { label: "K%", key: "Szn K%" },
    { label: "OBP", key: "Szn OBP" },
    { label: "SLG", key: "Szn SLG" },
    { label: "wRC+", key: "Szn wRC+" },
    { label: "EV90", key: "Szn EV90" },
    {
      label: "SqUpSw%",
      key: "Szn SqUpSw%",
    },
    {
      label: "Z-Contact%",
      key: "Szn Z-Contact%",
    },
    {
      label: "O-Swing%",
      key: "Szn O-Swing%",
    },
    { label: "SB", key: "Szn SB" },
  ];

  const last30Stats = [
    { label: "PA", key: "L30 PA" },
    { label: "BB%", key: "L30 BB%" },
    { label: "K%", key: "L30 K%" },
    { label: "OBP", key: "L30 OBP" },
    { label: "SLG", key: "L30 SLG" },
    { label: "wRC+", key: "L30 wRC+" },
    { label: "EV90", key: "L30 EV90" },
    {
      label: "SqUpSw%",
      key: "L30 SqUpSw%",
    },
    {
      label: "Z-Contact%",
      key: "L30 Z-Contact%",
    },
    {
      label: "O-Swing%",
      key: "L30 O-Swing%",
    },
    { label: "SB", key: "L30 SB" },
  ];

  function hitterPercentile(
    key: string
  ) {
    const value =
      numericValue(
        selectedHitter?.[key]
      );

    if (value === null) {
      return 0.5;
    }

    const isL30 =
      key.startsWith("L30 ");

    const qualifiedPopulation =
      hitters.filter((row) => {
        if (isL30) {
          const pa =
            numericValue(
              row["L30 PA"]
            );

          return (
            pa !== null &&
            pa >= 50
          );
        }

        const pa =
          numericValue(
            row["Szn PA"]
          );

        return (
          pa !== null &&
          pa >= seasonMinPA
        );
      });

    const population =
      qualifiedPopulation
        .map((row) =>
          numericValue(row[key])
        )
        .filter(
          (value): value is number =>
            value !== null
        );

    return percentileForValue(
      value,
      population,
      directions[key] || "higher"
    );
  }

  function chooseHitter(
    name: string
  ) {
    setSelectedHitterName(name);
    setHitterSearch(name);
    setShowSuggestions(false);
  }

  async function generateGraphic() {
    if (!graphicRef.current) {
      return;
    }

    const node =
      graphicRef.current;

    const previousStyle = {
      width: node.style.width,
      maxWidth: node.style.maxWidth,
      minWidth: node.style.minWidth,
      borderRadius:
        node.style.borderRadius,
    };

    try {
      setExporting(true);

      node.style.width = "1200px";
      node.style.maxWidth = "1200px";
      node.style.minWidth = "1200px";
      node.style.borderRadius = "0";

      await waitForImages(node);

      if (
        "fonts" in document &&
        document.fonts
      ) {
        await document.fonts.ready;
      }

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 300)
      );

      const exportHeight =
        node.scrollHeight;

      const dataUrl =
        await toPng(node, {
          pixelRatio: 1.5,
          backgroundColor:
            "#f4f6f8",
          width: 1200,
          height: exportHeight,
        });

      const safeName = (
        selectedHitterName ||
        "hitter"
      )
        .replace(
          /[^a-z0-9]+/gi,
          "-"
        )
        .replace(/^-|-$/g, "")
        .toLowerCase();

      const link =
        document.createElement("a");

      link.download =
        `${safeName}-hitter-graphic.png`;

      link.href = dataUrl;

      link.click();
    } catch (err) {
      console.error(
        "Graphic export failed:",
        err
      );

      alert(
        "The graphic could not be exported."
      );
    } finally {
      node.style.width =
        previousStyle.width;

      node.style.maxWidth =
        previousStyle.maxWidth;

      node.style.minWidth =
        previousStyle.minWidth;

      node.style.borderRadius =
        previousStyle.borderRadius;

      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-100 to-white px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-3xl border border-sky-200 bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 h-[60px] w-[240px]">
                <StreamStartersLogo />
              </div>

              <div className="text-sm font-black uppercase tracking-[0.2em] text-cyan-600">
                Fantasy Baseball
              </div>

              <h1 className="mt-1 text-4xl font-black tracking-tight">
                Hitter Matchup Tool
              </h1>

              <p className="mt-2 text-slate-500">
                Season and Last 30 hitter percentile analysis.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex w-fit items-center rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
            >
              ← Home
            </Link>
          </div>
        </header>

        {loading && (
          <div className="mb-5 rounded-2xl border border-sky-200 bg-white p-4 text-slate-600 shadow-sm">
            Loading hitter data...
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[380px_1fr]">
          <section className="h-fit rounded-3xl border border-sky-200 bg-white p-6 shadow-lg">
            <div className="mb-5">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-sky-500">
                Controls
              </div>

              <h2 className="mt-1 text-2xl font-black">
                Hitter Setup
              </h2>
            </div>

            <label className="mb-2 block text-sm font-bold text-slate-600">
              Hitter
            </label>

            <div className="relative mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={hitterSearch}
                  onChange={(e) => {
                    setHitterSearch(
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
                      e.key === "Escape"
                    ) {
                      setShowSuggestions(
                        false
                      );
                    }

                    if (
                      e.key === "Enter" &&
                      filteredHitters.length >
                        0
                    ) {
                      e.preventDefault();

                      chooseHitter(
                        filteredHitters[0][
                          "Name"
                        ]
                      );
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 pr-10 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  placeholder="Type a hitter name..."
                  autoComplete="off"
                />

                {hitterSearch && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => {
                      setHitterSearch("");
                      setShowSuggestions(
                        true
                      );
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400 transition hover:text-slate-700"
                    aria-label="Clear hitter search"
                  >
                    ×
                  </button>
                )}
              </div>

              {showSuggestions && (
                <div className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
                  {filteredHitters.length >
                  0 ? (
                    filteredHitters.map(
                      (hitter) => (
                        <button
                          type="button"
                          key={`${hitter["Name"]}-${hitter["Team"]}`}
                          onMouseDown={(
                            e
                          ) => {
                            e.preventDefault();
                          }}
                          onClick={() =>
                            chooseHitter(
                              hitter[
                                "Name"
                              ]
                            )
                          }
                          className="block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-sky-50 last:border-b-0"
                        >
                          <div className="font-bold text-slate-900">
                            {
                              hitter[
                                "Name"
                              ]
                            }
                          </div>

                          <div className="text-xs text-slate-500">
                            {
                              hitter[
                                "Team"
                              ]
                            }{" "}
                            •{" "}
                            {
                              hitter[
                                "Hand"
                              ]
                            }
                          </div>
                        </button>
                      )
                    )
                  ) : (
                    <div className="px-4 py-3 text-sm font-bold text-slate-500">
                      No hitters found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="font-black text-slate-900">
                    Season Min PA
                  </div>

                  <div className="text-xs text-slate-500">
                    Qualification and percentile pool
                  </div>
                </div>

                <div className="rounded-lg bg-sky-600 px-3 py-1 text-lg font-black text-white">
                  {seasonMinPA}+
                </div>
              </div>

              <input
                type="range"
                min="50"
                max="750"
                step="10"
                value={seasonMinPA}
                onChange={(e) =>
                  setSeasonMinPA(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="w-full cursor-pointer accent-sky-500"
              />

              <div className="mt-2 flex justify-between text-xs font-bold text-slate-500">
                <span>50 PA</span>
                <span>750 PA</span>
              </div>

              <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                Last 30 always requires{" "}
                <span className="font-black text-slate-900">
                  50+ PA
                </span>
                .
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  ESPN Roster %
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={espnRoster}
                  onChange={(e) =>
                    setEspnRoster(
                      e.target.value
                    )
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-900 outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Yahoo Roster %
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={yahooRoster}
                  onChange={(e) =>
                    setYahooRoster(
                      e.target.value
                    )
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-900 outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <label className="mb-2 block text-sm font-bold text-slate-600">
              Verdict Text
            </label>

            <input
              type="text"
              value={verdictText}
              onChange={(e) =>
                setVerdictText(
                  e.target.value
                )
              }
              maxLength={50}
              className="mb-5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-900 outline-none focus:border-sky-400"
            />

            <button
              type="button"
              onClick={generateGraphic}
              disabled={exporting}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 p-3 font-black text-white shadow-md transition hover:from-sky-600 hover:to-cyan-600 disabled:opacity-60"
            >
              {exporting
                ? "Generating PNG..."
                : "Generate Graphic"}
            </button>
          </section>

          <section className="rounded-3xl border border-sky-200 bg-white p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between px-1">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">
                  Live Preview
                </div>

                <h2 className="mt-1 text-2xl font-black">
                  Hitter Graphic
                </h2>
              </div>

              <div className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
                Export Ready
              </div>
            </div>

            <div className="overflow-auto">
              <section
                ref={graphicRef}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f4f6f8] text-black shadow-xl"
              >
                <div
                  className="flex items-center justify-between px-7 py-5"
                  style={{
                    background: `linear-gradient(120deg, ${theme.primary}, ${theme.primary} 70%, ${theme.secondary} 180%)`,
                  }}
                >
                  <div>
                    <div
                      className="text-4xl font-black"
                      style={{
                        color:
                          theme.secondary,
                      }}
                    >
                      {selectedHitter?.[
                        "Name"
                      ] || "—"}
                    </div>

                    <div className="mt-1 font-bold text-white/90">
                      {team || "—"} •{" "}
                      {hand || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-3 shadow-md">
                    <TeamLogo team={team} />
                  </div>
                </div>

                <div
                  className="flex items-center justify-between px-6 py-3"
                  style={{
                    backgroundColor:
                      theme.primary,
                    color:
                      theme.secondary,
                  }}
                >
                  <div className="text-2xl font-black">
                    Season Marks
                  </div>

                  <div className="text-sm font-black uppercase tracking-wide text-white/70">
                    Min. {seasonMinPA} PA
                  </div>
                </div>

                {!seasonQualified && (
                  <div className="bg-white px-6 py-2 text-sm font-black text-red-600">
                    This hitter is below the selected {seasonMinPA} PA minimum.
                  </div>
                )}

                <div className="grid grid-cols-3 lg:grid-cols-6 xl:grid-cols-11">
                  {seasonStats.map(
                    ({ label, key }) => (
                      <StatCell
                        key={key}
                        label={label}
                        value={
                          selectedHitter?.[
                            key
                          ]
                        }
                        percentile={
                          hitterPercentile(
                            key
                          )
                        }
                        qualified={
                          seasonQualified
                        }
                        neutral={
                          directions[key] ===
                          "neutral"
                        }
                        theme={theme}
                      />
                    )
                  )}
                </div>

                <div
                  className="mt-4 flex items-center justify-between px-6 py-3"
                  style={{
                    backgroundColor:
                      theme.primary,
                    color:
                      theme.secondary,
                  }}
                >
                  <div className="text-2xl font-black">
                    Last 30 Days
                  </div>

                  <div className="text-sm font-black uppercase tracking-wide text-white/70">
                    Min. 50 PA
                  </div>
                </div>

                {!l30Qualified && (
                  <div className="bg-white px-6 py-2 text-sm font-black text-red-600">
                    This hitter is below the 50 PA Last 30 minimum.
                  </div>
                )}

                <div className="grid grid-cols-3 lg:grid-cols-6 xl:grid-cols-11">
                  {last30Stats.map(
                    ({ label, key }) => (
                      <StatCell
                        key={key}
                        label={label}
                        value={
                          selectedHitter?.[
                            key
                          ]
                        }
                        percentile={
                          hitterPercentile(
                            key
                          )
                        }
                        qualified={
                          l30Qualified
                        }
                        neutral={
                          directions[key] ===
                          "neutral"
                        }
                        theme={theme}
                      />
                    )
                  )}
                </div>

                <section className="mx-6 mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                  <div
                    className="px-6 py-2 text-center text-lg font-black"
                    style={{
                      backgroundColor:
                        theme.primary,
                      color:
                        theme.secondary,
                    }}
                  >
                    Rostered
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="bg-red-600 px-6 py-4 text-center text-white">
                      <div className="text-xl font-black uppercase tracking-wide">
                        ESPN
                      </div>

                      <div className="mt-1 text-3xl font-black">
                        {espnRoster
                          ? `${espnRoster}%`
                          : "—"}
                      </div>
                    </div>

                    <div className="bg-purple-700 px-6 py-4 text-center text-white">
                      <div className="text-xl font-black uppercase tracking-wide">
                        Yahoo
                      </div>

                      <div className="mt-1 text-3xl font-black">
                        {yahooRoster
                          ? `${yahooRoster}%`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mx-6 mt-4 overflow-hidden rounded-2xl border border-black/10 shadow-md">
                  <div
                    className="px-6 py-2 text-center text-lg font-black uppercase tracking-wider"
                    style={{
                      backgroundColor:
                        theme.primary,
                      color:
                        theme.secondary,
                    }}
                  >
                    Verdict
                  </div>

                  <div className="bg-lime-400 px-6 py-6 text-center">
                    <div className="break-words text-4xl font-black tracking-tight text-black">
                      {verdictText.trim() ||
                        "Start"}
                    </div>
                  </div>
                </section>

                <div className="px-6 py-7">
                  <div className="mx-auto mb-5 max-w-sm">
                    <div className="mb-1 text-center text-xs font-black uppercase tracking-[0.2em] text-slate-500">
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
                      <span>Worse</span>
                      <span>Average</span>
                      <span>Better</span>
                    </div>
                  </div>

                  <div className="mx-auto h-[45px] w-[180px] opacity-75">
                    <StreamStartersLogo />
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}