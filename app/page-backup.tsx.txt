"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { toPng } from "html-to-image";

const PITCHER_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSv79k6WmmVy7nx9qfntanMdIxwBUWkPqu8L0B36iKekGYmrML_478QHxK15CinrTdKkWotB1FaigR1/pub?gid=371661956&single=true&output=csv";

const TEAM_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSv79k6WmmVy7nx9qfntanMdIxwBUWkPqu8L0B36iKekGYmrML_478QHxK15CinrTdKkWotB1FaigR1/pub?gid=1810390724&single=true&output=csv";

type DataRow = Record<string, string>;
type Direction = "higher" | "lower" | "neutral";

type TeamTheme = {
  primary: string;
  secondary: string;
  text: string;
};

const TEAM_THEMES: Record<string, TeamTheme> = {
  ARI: { primary: "#A71930", secondary: "#E3D4AD", text: "#FFFFFF" },
  ATL: { primary: "#13274F", secondary: "#CE1141", text: "#FFFFFF" },
  BAL: { primary: "#DF4601", secondary: "#000000", text: "#FFFFFF" },
  BOS: { primary: "#0C2340", secondary: "#BD3039", text: "#FFFFFF" },
  CHC: { primary: "#0E3386", secondary: "#CC3433", text: "#FFFFFF" },
  CHW: { primary: "#27251F", secondary: "#C4CED4", text: "#FFFFFF" },
  CIN: { primary: "#C6011F", secondary: "#000000", text: "#FFFFFF" },
  CLE: { primary: "#00385D", secondary: "#E50022", text: "#FFFFFF" },
  COL: { primary: "#33006F", secondary: "#C4CED4", text: "#FFFFFF" },
  DET: { primary: "#0C2340", secondary: "#FA4616", text: "#FFFFFF" },
  HOU: { primary: "#002D62", secondary: "#EB6E1F", text: "#FFFFFF" },
  KCR: { primary: "#004687", secondary: "#BD9B60", text: "#FFFFFF" },
  LAA: { primary: "#BA0021", secondary: "#003263", text: "#FFFFFF" },
  LAD: { primary: "#005A9C", secondary: "#EF3E42", text: "#FFFFFF" },
  MIA: { primary: "#00A3E0", secondary: "#EF3340", text: "#FFFFFF" },
  MIL: { primary: "#12284B", secondary: "#FFC52F", text: "#FFFFFF" },
  MIN: { primary: "#002B5C", secondary: "#D31145", text: "#FFFFFF" },
  NYM: { primary: "#002D72", secondary: "#FF5910", text: "#FFFFFF" },
  NYY: { primary: "#0C2340", secondary: "#C4CED4", text: "#FFFFFF" },
  ATH: { primary: "#003831", secondary: "#EFB21E", text: "#FFFFFF" },
  PHI: { primary: "#E81828", secondary: "#002D72", text: "#FFFFFF" },
  PIT: { primary: "#27251F", secondary: "#FDB827", text: "#FFFFFF" },
  SDP: { primary: "#2F241D", secondary: "#FFC425", text: "#FFFFFF" },
  SEA: { primary: "#0C2C56", secondary: "#005C5C", text: "#FFFFFF" },
  SFG: { primary: "#27251F", secondary: "#FD5A1E", text: "#FFFFFF" },
  STL: { primary: "#C41E3A", secondary: "#0C2340", text: "#FFFFFF" },
  TBR: { primary: "#092C5C", secondary: "#8FBCE6", text: "#FFFFFF" },
  TEX: { primary: "#003278", secondary: "#C0111F", text: "#FFFFFF" },
  TOR: { primary: "#134A8E", secondary: "#E8291C", text: "#FFFFFF" },
  WSN: { primary: "#AB0003", secondary: "#14225A", text: "#FFFFFF" },
};

const DEFAULT_THEME: TeamTheme = {
  primary: "#0d5a96",
  secondary: "#ff3344",
  text: "#FFFFFF",
};

const VALID_TEAMS = new Set(Object.keys(TEAM_THEMES));

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
    .filter((line) => line.trim() !== "");

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

  const num = Number(cleaned);

  return Number.isFinite(num) ? num : null;
}

function percentileForValue(
  value: number,
  population: number[],
  direction: Direction
) {
  if (direction === "neutral") return 0.5;
  if (!population.length) return 0.5;

  const sorted = [...population].sort((a, b) => a - b);
  const lessOrEqual = sorted.filter((n) => n <= value).length;

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

function percentileColor(
  percentile: number,
  neutral = false
) {
  if (neutral) return "#ffffff";

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

function textColorForPercentile(
  percentile: number,
  neutral = false
) {
  if (neutral) return "#111827";

  if (
    percentile < 0.12 ||
    percentile > 0.88
  ) {
    return "#ffffff";
  }

  return "#111827";
}

function SectionTitle({
  children,
  theme,
}: {
  children: ReactNode;
  theme: TeamTheme;
}) {
  return (
    <div
      className="relative z-10 flex items-center gap-3 px-6 py-3"
      style={{
        backgroundColor: theme.primary,
        color: theme.secondary,
      }}
    >
      <div
        className="h-7 w-1 rounded-full"
        style={{
          backgroundColor: theme.secondary,
        }}
      />

      <div className="w-full text-2xl font-black tracking-tight">
        {children}
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  percentile,
  neutral = false,
  theme,
}: {
  label: string;
  value: string | undefined;
  percentile?: number;
  neutral?: boolean;
  theme: TeamTheme;
}) {
  const p = percentile ?? 0.5;

  return (
    <div className="relative z-10 min-w-0 border-r border-white/15 last:border-r-0">
      <div
        className="flex h-11 items-center justify-center border-b border-white/10 px-2 text-center text-sm font-black md:text-base"
        style={{
          backgroundColor: theme.primary,
          color: theme.secondary,
        }}
      >
        {label}
      </div>

      <div
        className="flex min-h-[54px] items-center justify-center px-2 text-center text-base font-black"
        style={{
          backgroundColor: percentileColor(
            p,
            neutral
          ),
          color: textColorForPercentile(
            p,
            neutral
          ),
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function getEspnLogoTeamCode(team: string) {
  const overrides: Record<string, string> = {
    CHW: "chw",
    WSN: "wsh",
    KCR: "kc",
    SDP: "sd",
    SFG: "sf",
    TBR: "tb",
  };

  return (
    overrides[team] ||
    team.toLowerCase()
  );
}

function getTeamLogoUrl(team: string) {
  if (!VALID_TEAMS.has(team)) {
    return null;
  }

  const code = getEspnLogoTeamCode(team);

  return `https://a.espncdn.com/i/teamlogos/mlb/500/${code}.png`;
}

function TeamLogo({
  team,
  size = "large",
}: {
  team: string;
  size?: "small" | "large";
}) {
  const logoUrl = getTeamLogoUrl(team);

  const sizeClass =
    size === "large"
      ? "h-20 w-20"
      : "h-14 w-14";

  if (!logoUrl) {
    return (
      <div
        className={`${sizeClass} flex items-center justify-center rounded-xl bg-white text-center text-xs font-black text-neutral-700`}
      >
        {team || "MLB"}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`${team} logo`}
      className={`${sizeClass} object-contain`}
    />
  );
}

function StreamStartersLogo({
  compact = false,
}: {
  compact?: boolean;
}) {
  if (compact) {
    return (
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        aria-hidden="true"
      >
        <rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="24"
          fill="#0F172A"
        />

        <path
          d="M23 65 L39 51 L51 58 L76 33"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M65 33 H76 V44"
          fill="none"
          stroke="#38BDF8"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <text
          x="50"
          y="82"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="23"
          fontWeight="900"
          letterSpacing="1"
        >
          SS
        </text>
      </svg>
    );
  }

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
        FANTASY BASEBALL
      </text>
    </svg>
  );
}

function BaseballBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(15,23,42,0.11) 1px, transparent 1.3px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.28))",
        }}
      />

      <svg
        className="absolute -bottom-20 -left-28 h-[500px] w-[500px] opacity-[0.055]"
        viewBox="0 0 500 500"
      >
        <circle
          cx="250"
          cy="250"
          r="210"
          fill="none"
          stroke="#0F172A"
          strokeWidth="6"
        />

        <path
          d="M118 105 C210 165 210 335 118 395"
          fill="none"
          stroke="#0F172A"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="10 14"
        />

        <path
          d="M382 105 C290 165 290 335 382 395"
          fill="none"
          stroke="#0F172A"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="10 14"
        />
      </svg>

      <svg
        className="absolute right-[-150px] top-[370px] h-[400px] w-[400px] opacity-[0.04]"
        viewBox="0 0 500 500"
      >
        <circle
          cx="250"
          cy="250"
          r="205"
          fill="none"
          stroke="#0F172A"
          strokeWidth="5"
        />

        <path
          d="M120 110 C220 180 220 320 120 390"
          fill="none"
          stroke="#0F172A"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="9 15"
        />

        <path
          d="M380 110 C280 180 280 320 380 390"
          fill="none"
          stroke="#0F172A"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="9 15"
        />
      </svg>
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

export default function Home() {
  const graphicRef =
    useRef<HTMLDivElement>(null);

  const [pitchers, setPitchers] =
    useState<DataRow[]>([]);

  const [teams, setTeams] =
    useState<DataRow[]>([]);

  const [
    selectedPitcherName,
    setSelectedPitcherName,
  ] = useState("");

  const [
    pitcherSearch,
    setPitcherSearch,
  ] = useState("");

  const [
    showPitcherSuggestions,
    setShowPitcherSuggestions,
  ] = useState(false);

  const [
    selectedOpponent,
    setSelectedOpponent,
  ] = useState("");

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
  ] = useState("10+ Team Stream");

  const [
    seasonMinIP,
    setSeasonMinIP,
  ] = useState(30);

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
        setError("");

        const [pitcherRes, teamRes] =
          await Promise.all([
            fetch(PITCHER_CSV_URL, {
              cache: "no-store",
            }),

            fetch(TEAM_CSV_URL, {
              cache: "no-store",
            }),
          ]);

        if (
          !pitcherRes.ok ||
          !teamRes.ok
        ) {
          throw new Error(
            "Failed to fetch sheet data."
          );
        }

        const [
          pitcherText,
          teamText,
        ] = await Promise.all([
          pitcherRes.text(),
          teamRes.text(),
        ]);

        const pitcherRows =
          parseCSV(pitcherText)
            .filter(
              (row) => row["Player"]
            )
            .sort((a, b) =>
              (a["Player"] || "").localeCompare(
                b["Player"] || ""
              )
            );

        const teamRows =
          parseCSV(teamText)
            .filter(
              (row) => row["Team"]
            )
            .sort((a, b) =>
              (a["Team"] || "").localeCompare(
                b["Team"] || ""
              )
            );

        setPitchers(pitcherRows);
        setTeams(teamRows);

        if (pitcherRows.length > 0) {
          setSelectedPitcherName(
            pitcherRows[0]["Player"]
          );

          setPitcherSearch(
            pitcherRows[0]["Player"]
          );
        }

        if (teamRows.length > 0) {
          setSelectedOpponent(
            teamRows[0]["Team"]
          );
        }
      } catch (err) {
        console.error(err);

        setError(
          "Failed to load Google Sheets data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredPitchers =
    useMemo(() => {
      const query =
        pitcherSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return pitchers.slice(0, 10);
      }

      return pitchers
        .filter((pitcher) =>
          (
            pitcher["Player"] || ""
          )
            .toLowerCase()
            .includes(query)
        )
        .slice(0, 10);
    }, [pitchers, pitcherSearch]);

  const selectedPitcher =
    useMemo(
      () =>
        pitchers.find(
          (pitcher) =>
            pitcher["Player"] ===
            selectedPitcherName
        ),
      [
        pitchers,
        selectedPitcherName,
      ]
    );

  const selectedTeamRow =
    useMemo(
      () =>
        teams.find(
          (team) =>
            team["Team"] ===
            selectedOpponent
        ),
      [teams, selectedOpponent]
    );

  const pitcherTeam =
    selectedPitcher?.["Team"] || "";

  const theme =
    TEAM_THEMES[pitcherTeam] ||
    DEFAULT_THEME;

  const pitcherHand =
    (
      selectedPitcher?.["Hand"] ||
      ""
    ).toUpperCase();

  const isLefty =
    pitcherHand.startsWith("L");

  const handLabel =
    isLefty ? "LHP" : "RHP";

  const selectedSeasonIP =
    numericValue(
      selectedPitcher?.["IP"]
    );

  const selectedL30IP =
    numericValue(
      selectedPitcher?.["L30 IP"]
    );

  const seasonQualified =
    selectedSeasonIP !== null &&
    selectedSeasonIP >= seasonMinIP;

  const last30Qualified =
    selectedL30IP !== null &&
    selectedL30IP >= 10;

  const pitcherDirections: Record<
    string,
    Direction
  > = {
    IP: "neutral",
    ERA: "lower",
    SIERA: "lower",
    "K%": "higher",
    "BB%": "lower",
    WHIP: "lower",
    "Strike%": "higher",
    "SwStr%": "higher",
    "Stuff+": "higher",

    "L30 IP": "neutral",
    "L30 ERA": "lower",
    "L30 SIERA": "lower",
    "L30 K%": "higher",
    "L30 BB%": "lower",
    "L30 WHIP": "lower",
    "L30 Strike%": "higher",
    "L30 SwStr%": "higher",
    "L30 Stuff+": "higher",
  };

  const seasonStats = [
    { label: "IP", key: "IP" },
    { label: "ERA", key: "ERA" },
    { label: "SIERA", key: "SIERA" },
    { label: "K%", key: "K%" },
    { label: "BB%", key: "BB%" },
    { label: "WHIP", key: "WHIP" },
    {
      label: "Strike%",
      key: "Strike%",
    },
    {
      label: "SwStr%",
      key: "SwStr%",
    },
    {
      label: "Stuff+",
      key: "Stuff+",
    },
  ];

  const last30Stats = [
    {
      label: "IP",
      key: "L30 IP",
    },
    {
      label: "ERA",
      key: "L30 ERA",
    },
    {
      label: "SIERA",
      key: "L30 SIERA",
    },
    {
      label: "K%",
      key: "L30 K%",
    },
    {
      label: "BB%",
      key: "L30 BB%",
    },
    {
      label: "WHIP",
      key: "L30 WHIP",
    },
    {
      label: "Strike%",
      key: "L30 Strike%",
    },
    {
      label: "SwStr%",
      key: "L30 SwStr%",
    },
    {
      label: "Stuff+",
      key: "L30 Stuff+",
    },
  ];

  const pitcherPercentile = (
    key: string
  ) => {
    const value =
      numericValue(
        selectedPitcher?.[key]
      );

    if (value === null) {
      return 0.5;
    }

    const isLast30 =
      key.startsWith("L30 ");

    const qualifiedPitchers =
      pitchers.filter((row) => {
        if (isLast30) {
          const l30IP =
            numericValue(
              row["L30 IP"]
            );

          return (
            l30IP !== null &&
            l30IP >= 10
          );
        }

        const seasonIP =
          numericValue(row["IP"]);

        return (
          seasonIP !== null &&
          seasonIP >= seasonMinIP
        );
      });

    const population =
      qualifiedPitchers
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
      pitcherDirections[key] ||
        "higher"
    );
  };

  const matchupStats =
    useMemo(() => {
      if (!selectedTeamRow) {
        return null;
      }

      const kKey =
        isLefty ? "K% vL" : "K% vR";

      const bbKey =
        isLefty
          ? "BB% vL"
          : "BB% vR";

      const wrcKey =
        isLefty
          ? "wRC+ vL"
          : "wRC+ vR";

      return {
        handK: {
          key: kKey,
          value:
            selectedTeamRow[kKey] ||
            "",
          direction:
            "higher" as Direction,
        },

        handBB: {
          key: bbKey,
          value:
            selectedTeamRow[bbKey] ||
            "",
          direction:
            "lower" as Direction,
        },

        handWRC: {
          key: wrcKey,
          value:
            selectedTeamRow[wrcKey] ||
            "",
          direction:
            "lower" as Direction,
        },

        l30K: {
          key: "K% L30",
          value:
            selectedTeamRow[
              "K% L30"
            ] || "",
          direction:
            "higher" as Direction,
        },

        l30BB: {
          key: "BB% L30",
          value:
            selectedTeamRow[
              "BB% L30"
            ] || "",
          direction:
            "lower" as Direction,
        },

        l30WRC: {
          key: "wRC+ L30",
          value:
            selectedTeamRow[
              "wRC+ L30"
            ] || "",
          direction:
            "lower" as Direction,
        },
      };
    }, [selectedTeamRow, isLefty]);

  const teamPercentile = (
    key: string,
    value: string,
    direction: Direction
  ) => {
    const numeric =
      numericValue(value);

    if (numeric === null) {
      return 0.5;
    }

    const population = teams
      .map((row) =>
        numericValue(row[key])
      )
      .filter(
        (value): value is number =>
          value !== null
      );

    return percentileForValue(
      numeric,
      population,
      direction
    );
  };

  function choosePitcher(
    name: string
  ) {
    setSelectedPitcherName(name);
    setPitcherSearch(name);

    setShowPitcherSuggestions(
      false
    );
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
        selectedPitcherName ||
        "stream-starter"
      )
        .replace(
          /[^a-z0-9]+/gi,
          "-"
        )
        .replace(/^-|-$/g, "")
        .toLowerCase();

      const safeOpponent = (
        selectedOpponent ||
        "opponent"
      ).toLowerCase();

      const link =
        document.createElement("a");

      link.download =
        `${safeName}-vs-${safeOpponent}.png`;

      link.href = dataUrl;

      link.click();
    } catch (err) {
      console.error(
        "Graphic export failed:",
        err
      );

      alert(
        "The graphic could not be exported. Check the browser console for details."
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
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-4xl font-black tracking-tight">
          Stream Starters
        </h1>

        <p className="mb-8 text-slate-400">
          Generate pitcher matchup graphics from your Google Sheets data.
        </p>

        {loading && (
          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
            Loading sheet data...
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950 p-4 text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[380px_1fr]">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-xl font-bold">
              Graphic Setup
            </h2>

            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Pitcher
            </label>

            <div className="relative mb-5">
              <input
                type="text"
                value={pitcherSearch}
                onChange={(e) => {
                  setPitcherSearch(
                    e.target.value
                  );

                  setShowPitcherSuggestions(
                    true
                  );
                }}
                onFocus={() =>
                  setShowPitcherSuggestions(
                    true
                  )
                }
                placeholder="Type a pitcher name..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none transition focus:border-slate-500"
              />

              {showPitcherSuggestions &&
                filteredPitchers.length >
                  0 && (
                  <div className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
                    {filteredPitchers.map(
                      (pitcher) => (
                        <button
                          key={
                            pitcher[
                              "Player"
                            ]
                          }
                          type="button"
                          onClick={() =>
                            choosePitcher(
                              pitcher[
                                "Player"
                              ]
                            )
                          }
                          className="block w-full border-b border-slate-700 px-4 py-3 text-left hover:bg-slate-700 last:border-b-0"
                        >
                          <div className="font-semibold">
                            {
                              pitcher[
                                "Player"
                              ]
                            }
                          </div>

                          <div className="text-xs text-slate-400">
                            {
                              pitcher[
                                "Team"
                              ]
                            }{" "}
                            •{" "}
                            {
                              pitcher[
                                "Hand"
                              ]
                            }
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
            </div>

            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Opponent
            </label>

            <select
              className="mb-5 w-full rounded-xl border border-slate-700 bg-slate-800 p-3"
              value={selectedOpponent}
              onChange={(e) =>
                setSelectedOpponent(
                  e.target.value
                )
              }
            >
              {teams.map((team) => (
                <option
                  key={team["Team"]}
                  value={team["Team"]}
                >
                  {team["Team"]}
                </option>
              ))}
            </select>

            <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-200">
                    Season Min IP
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    Season qualification and percentile pool
                  </div>
                </div>

                <div className="rounded-lg bg-slate-950 px-3 py-1 text-lg font-black text-white">
                  {seasonMinIP}+
                </div>
              </div>

              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={seasonMinIP}
                onChange={(e) =>
                  setSeasonMinIP(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="w-full cursor-pointer accent-sky-400"
              />

              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
                <span>10 IP</span>
                <span>200 IP</span>
              </div>

              <div className="mt-3 rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                Last 30 requires{" "}
                <span className="font-bold text-white">
                  10+ L30 IP
                </span>
                .
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white"
                />
              </div>
            </div>

            <label className="mb-2 block text-sm font-semibold text-slate-300">
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
              placeholder="Example: 10+ Team Stream"
              maxLength={50}
              className="mb-5 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none transition focus:border-slate-500"
            />

            <button
              type="button"
              onClick={generateGraphic}
              disabled={exporting}
              className="w-full rounded-xl bg-white p-3 font-black text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting
                ? "Generating PNG..."
                : "Generate Graphic"}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-4 text-xl font-bold">
              Preview
            </h2>

            <div className="overflow-auto">
              <div
                ref={graphicRef}
                className="relative overflow-hidden rounded-2xl border border-black/10 bg-[#f4f6f8] text-black shadow-xl"
              >
                <BaseballBackground />

                <div
                  className="relative z-10 flex items-center justify-between overflow-hidden px-7 py-5"
                  style={{
                    background: `linear-gradient(
                      120deg,
                      ${theme.primary} 0%,
                      ${theme.primary} 68%,
                      ${theme.secondary} 190%
                    )`,
                  }}
                >
                  <div className="relative z-10">
                    <div
                      className="text-4xl font-black tracking-tight"
                      style={{
                        color:
                          theme.secondary,
                      }}
                    >
                      {selectedPitcher?.[
                        "Player"
                      ] || "—"}
                    </div>

                    <div className="mt-1 text-base font-bold text-white/90">
                      {pitcherTeam || "—"} •{" "}
                      {pitcherHand || "—"}
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center gap-4">
                    <div
                      className="rounded-xl border border-white/20 px-5 py-3 text-right shadow-md"
                      style={{
                        backgroundColor:
                          theme.secondary,
                        color:
                          theme.primary,
                      }}
                    >
                      <div className="text-xs font-black uppercase tracking-wider opacity-70">
                        Matchup
                      </div>

                      <div className="text-2xl font-black">
                        {pitcherTeam} @{" "}
                        {selectedOpponent}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-3 shadow-md">
                      <TeamLogo
                        team={pitcherTeam}
                        size="small"
                      />
                    </div>
                  </div>
                </div>

                <section className="relative z-10 border-t border-black/10">
                  <SectionTitle theme={theme}>
                    <div className="flex w-full items-center justify-between gap-4">
                      <div className="flex items-baseline gap-3">
                        <span>
                          Season Marks
                        </span>

                        <span className="text-sm font-black uppercase tracking-wide text-white/70">
                          Min. {seasonMinIP} IP
                        </span>
                      </div>

                      {!seasonQualified && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/80">
                          Below {seasonMinIP} IP
                        </span>
                      )}
                    </div>
                  </SectionTitle>

                  <div className="grid grid-cols-3 md:grid-cols-9">
                    {seasonStats.map(
                      ({ label, key }) => (
                        <StatCell
                          key={key}
                          label={label}
                          value={
                            seasonQualified
                              ? selectedPitcher?.[
                                  key
                                ]
                              : ""
                          }
                          percentile={
                            seasonQualified
                              ? pitcherPercentile(
                                  key
                                )
                              : 0.5
                          }
                          neutral={
                            !seasonQualified ||
                            pitcherDirections[
                              key
                            ] ===
                              "neutral"
                          }
                          theme={theme}
                        />
                      )
                    )}
                  </div>
                </section>

                <section className="relative z-10 mt-3 border-t border-black/10">
                  <SectionTitle theme={theme}>
                    <div className="flex w-full items-center justify-between gap-4">
                      <div className="flex items-baseline gap-3">
                        <span>
                          Last 30 Days
                        </span>

                        <span className="text-sm font-black uppercase tracking-wide text-white/70">
                          Min. 10 IP
                        </span>
                      </div>

                      {!last30Qualified && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/80">
                          Below 10 IP
                        </span>
                      )}
                    </div>
                  </SectionTitle>

                  <div className="grid grid-cols-3 md:grid-cols-9">
                    {last30Stats.map(
                      ({ label, key }) => (
                        <StatCell
                          key={key}
                          label={label}
                          value={
                            last30Qualified
                              ? selectedPitcher?.[
                                  key
                                ]
                              : ""
                          }
                          percentile={
                            last30Qualified
                              ? pitcherPercentile(
                                  key
                                )
                              : 0.5
                          }
                          neutral={
                            !last30Qualified ||
                            pitcherDirections[
                              key
                            ] ===
                              "neutral"
                          }
                          theme={theme}
                        />
                      )
                    )}
                  </div>
                </section>

                <section className="relative z-10 mx-4 mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                  <div className="grid md:grid-cols-[1.1fr_repeat(3,1fr)]">
                    <div
                      className="row-span-2 flex items-center justify-center border-r border-white/15 px-5 py-5"
                      style={{
                        backgroundColor:
                          theme.primary,
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="rounded-2xl bg-white p-3 shadow-md">
                          <TeamLogo
                            team={
                              selectedOpponent
                            }
                          />
                        </div>

                        <div
                          className="mt-3 text-2xl font-black tracking-wide"
                          style={{
                            color:
                              theme.secondary,
                          }}
                        >
                          {selectedOpponent}
                        </div>

                        <div className="mt-1 text-xs font-black uppercase tracking-wider text-white/60">
                          Opponent
                        </div>
                      </div>
                    </div>

                    <StatCell
                      label={`K% vs ${handLabel}`}
                      value={
                        matchupStats?.handK
                          .value
                      }
                      percentile={
                        matchupStats
                          ? teamPercentile(
                              matchupStats
                                .handK.key,
                              matchupStats
                                .handK.value,
                              matchupStats
                                .handK
                                .direction
                            )
                          : 0.5
                      }
                      theme={theme}
                    />

                    <StatCell
                      label={`BB% vs ${handLabel}`}
                      value={
                        matchupStats?.handBB
                          .value
                      }
                      percentile={
                        matchupStats
                          ? teamPercentile(
                              matchupStats
                                .handBB.key,
                              matchupStats
                                .handBB.value,
                              matchupStats
                                .handBB
                                .direction
                            )
                          : 0.5
                      }
                      theme={theme}
                    />

                    <StatCell
                      label={`wRC+ vs ${handLabel}`}
                      value={
                        matchupStats?.handWRC
                          .value
                      }
                      percentile={
                        matchupStats
                          ? teamPercentile(
                              matchupStats
                                .handWRC.key,
                              matchupStats
                                .handWRC.value,
                              matchupStats
                                .handWRC
                                .direction
                            )
                          : 0.5
                      }
                      theme={theme}
                    />

                    <StatCell
                      label="K% L30"
                      value={
                        matchupStats?.l30K
                          .value
                      }
                      percentile={
                        matchupStats
                          ? teamPercentile(
                              matchupStats
                                .l30K.key,
                              matchupStats
                                .l30K.value,
                              matchupStats
                                .l30K.direction
                            )
                          : 0.5
                      }
                      theme={theme}
                    />

                    <StatCell
                      label="BB% L30"
                      value={
                        matchupStats?.l30BB
                          .value
                      }
                      percentile={
                        matchupStats
                          ? teamPercentile(
                              matchupStats
                                .l30BB.key,
                              matchupStats
                                .l30BB.value,
                              matchupStats
                                .l30BB.direction
                            )
                          : 0.5
                      }
                      theme={theme}
                    />

                    <StatCell
                      label="wRC+ L30"
                      value={
                        matchupStats?.l30WRC
                          .value
                      }
                      percentile={
                        matchupStats
                          ? teamPercentile(
                              matchupStats
                                .l30WRC.key,
                              matchupStats
                                .l30WRC.value,
                              matchupStats
                                .l30WRC.direction
                            )
                          : 0.5
                      }
                      theme={theme}
                    />
                  </div>
                </section>

                <section className="relative z-10 mx-6 mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
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

                <section className="relative z-10 mx-6 mt-4 overflow-hidden rounded-2xl border border-black/10 shadow-md">
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
                        "10+ Team Stream"}
                    </div>
                  </div>
                </section>

                <div className="relative z-10 mt-4 min-h-[130px] px-6 pb-6">
                  <div className="pointer-events-none absolute bottom-0 left-4 h-28 w-28 opacity-[0.045]">
                    <StreamStartersLogo compact />
                  </div>

                  <div className="mx-auto max-w-sm">
                    <div className="mb-1 text-center text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                      Percentile Key
                    </div>

                    <div
                      className="h-4 rounded-full border border-neutral-300"
                      style={{
                        background:
                          "linear-gradient(90deg, rgb(58,116,192) 0%, white 50%, rgb(220,45,45) 100%)",
                      }}
                    />

                    <div className="mt-1 flex justify-between text-xs font-bold text-neutral-500">
                      <span>Worse</span>
                      <span>Average</span>
                      <span>Better</span>
                    </div>
                  </div>

                  <div className="absolute bottom-3 right-4 h-[42px] w-[165px] rounded-xl border border-slate-200/80 bg-white/90 px-2 py-1 shadow-sm">
                    <StreamStartersLogo />
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}