import { fetchBoundedText } from "./adapters.ts";
import { DataIngestionError } from "./errors.ts";
import type { AdapterOutput, CanonicalRow, DatasetAdapter } from "./types.ts";

const ENDPOINT = "https://www.fangraphs.com/api/leaders/major-league/data";
const CONFIRMED_QUERY = {
  pos: "all",
  stats: "bat",
  lg: "all",
  qual: "0",
  season: "2026",
  season1: "2026",
  ind: "0",
  team: "0,ts",
  rost: "",
  filter: "",
  players: "0",
  v_cr: "202301",
  type: "c,35,34,61",
  pageitems: "2000000000",
} as const;

export const MLB_TEAM_KEYS_2026 = [
  "ARI", "ATL", "BAL", "BOS", "CHC", "CHW", "CIN", "CLE", "COL", "DET",
  "HOU", "KCR", "LAA", "LAD", "MIA", "MIL", "MIN", "NYM", "NYY", "ATH",
  "PHI", "PIT", "SDP", "SEA", "SFG", "STL", "TBR", "TEX", "TOR", "WSN",
] as const;

const MLB_TEAM_SET = new Set<string>(MLB_TEAM_KEYS_2026);

export type FanGraphsTeamOffenseMonth = 3 | 13 | 14;
type FanGraphsRow = Record<string, unknown>;
type ReportName = "last 30 days" | "versus left-handed pitching" | "versus right-handed pitching";

export type FanGraphsTeamOffenseInputs = {
  last30: readonly FanGraphsRow[];
  versusLeft: readonly FanGraphsRow[];
  versusRight: readonly FanGraphsRow[];
};

export function buildFanGraphsTeamOffenseUrl(month: FanGraphsTeamOffenseMonth) {
  const url = new URL(ENDPOINT);
  for (const [key, value] of Object.entries(CONFIRMED_QUERY)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("month", String(month));
  return url;
}

function failTransform(report: ReportName, message: string, code: string): never {
  throw new DataIngestionError(
    "mlb_team_offense",
    "transform",
    `MLB team offense: FanGraphs ${report} ${message}`,
    code,
  );
}

function canonicalTeam(value: unknown, report: ReportName) {
  const team = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!team || !MLB_TEAM_SET.has(team)) {
    failTransform(report, "contained a blank or unknown team key.", "FANGRAPHS_TEAM_KEY_INVALID");
  }
  return team;
}

function finiteMetric(value: unknown, field: "K%" | "BB%" | "wRC+", report: ReportName) {
  let parsed: number;
  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "string" && value.trim() !== "") {
    const normalized = value.trim().replace(/,/g, "");
    const isPercent = normalized.endsWith("%");
    parsed = Number(isPercent ? normalized.slice(0, -1) : normalized);
    if (isPercent) parsed /= 100;
  } else {
    parsed = Number.NaN;
  }

  if (!Number.isFinite(parsed)) {
    failTransform(report, `contained an invalid ${field} value.`, "FANGRAPHS_TEAM_METRIC_INVALID");
  }
  return parsed;
}

function indexReport(rows: readonly FanGraphsRow[], report: ReportName) {
  const indexed = new Map<string, FanGraphsRow>();
  for (const row of rows) {
    const team = canonicalTeam(row.TeamNameAbb, report);
    if (indexed.has(team)) {
      failTransform(report, `returned duplicate team ${team}.`, "FANGRAPHS_TEAM_DUPLICATE");
    }
    indexed.set(team, row);
  }

  if (
    indexed.size !== MLB_TEAM_KEYS_2026.length ||
    MLB_TEAM_KEYS_2026.some((team) => !indexed.has(team))
  ) {
    failTransform(
      report,
      "did not contain the exact 30-team MLB set.",
      "FANGRAPHS_TEAM_SET_MISMATCH",
    );
  }
  return indexed;
}

function mappedMetrics(row: FanGraphsRow, suffix: "L30" | "vL" | "vR", report: ReportName) {
  return {
    [`K% ${suffix}`]: finiteMetric(row["K%"], "K%", report),
    [`BB% ${suffix}`]: finiteMetric(row["BB%"], "BB%", report),
    [`wRC+ ${suffix}`]: finiteMetric(row["wRC+"], "wRC+", report),
  } satisfies CanonicalRow;
}

export function transformFanGraphsTeamOffense(
  inputs: FanGraphsTeamOffenseInputs,
): CanonicalRow[] {
  const last30 = indexReport(inputs.last30, "last 30 days");
  const versusLeft = indexReport(inputs.versusLeft, "versus left-handed pitching");
  const versusRight = indexReport(inputs.versusRight, "versus right-handed pitching");

  return [...last30].map(([team, recent]) => ({
    Team: team,
    ...mappedMetrics(recent, "L30", "last 30 days"),
    ...mappedMetrics(versusLeft.get(team)!, "vL", "versus left-handed pitching"),
    ...mappedMetrics(versusRight.get(team)!, "vR", "versus right-handed pitching"),
  } satisfies CanonicalRow));
}

function parseRows(text: string, report: ReportName): FanGraphsRow[] {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    failTransform(report, "response was not valid JSON. Try again.", "FANGRAPHS_TEAM_JSON_INVALID");
  }
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : null;
  if (!rows || rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
    failTransform(
      report,
      "response did not contain a usable row list. Try again.",
      "FANGRAPHS_TEAM_SHAPE_INVALID",
    );
  }
  return rows as FanGraphsRow[];
}

async function fetchReport(
  report: ReportName,
  month: FanGraphsTeamOffenseMonth,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  try {
    const text = await fetchBoundedText(
      "mlb_team_offense",
      buildFanGraphsTeamOffenseUrl(month).toString(),
      signal,
      fetcher,
    );
    return { rows: parseRows(text, report), fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof DataIngestionError && error.stage === "transform") throw error;
    throw new DataIngestionError(
      "mlb_team_offense",
      "fetch",
      `MLB team offense: FanGraphs ${report} request failed. Try again or check FanGraphs availability.`,
      "FANGRAPHS_TEAM_FETCH_FAILED",
    );
  }
}

export class FanGraphsTeamOffenseAdapter implements DatasetAdapter {
  readonly key = "mlb_team_offense" as const;

  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async load(signal: AbortSignal): Promise<AdapterOutput> {
    const [last30, versusLeft, versusRight] = await Promise.all([
      fetchReport("last 30 days", 3, signal, this.fetcher),
      fetchReport("versus left-handed pitching", 13, signal, this.fetcher),
      fetchReport("versus right-handed pitching", 14, signal, this.fetcher),
    ]);
    const rows = transformFanGraphsTeamOffense({
      last30: last30.rows,
      versusLeft: versusLeft.rows,
      versusRight: versusRight.rows,
    });

    return {
      rows,
      sourceLabel: "FanGraphs",
      sourceTimestamp: null,
      sourceDetails: {
        query: { ...CONFIRMED_QUERY },
        last30: { month: 3, fetchedAt: last30.fetchedAt, rowCount: last30.rows.length },
        versusLeft: { month: 13, fetchedAt: versusLeft.fetchedAt, rowCount: versusLeft.rows.length },
        versusRight: { month: 14, fetchedAt: versusRight.fetchedAt, rowCount: versusRight.rows.length },
        canonicalRowCount: rows.length,
        seasonYear: 2026,
      },
    };
  }
}
