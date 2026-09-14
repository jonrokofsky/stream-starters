import { fetchBoundedText } from "./adapters.ts";
import { DataIngestionError } from "./errors.ts";
import type { AdapterOutput, CanonicalRow, DatasetAdapter } from "./types.ts";

const ENDPOINT = "https://www.fangraphs.com/api/leaders/major-league/data";
const CONFIRMED_QUERY = {
  pos: "all",
  lg: "all",
  season: "2026",
  season1: "2026",
  ind: "0",
  pageitems: "2000000000",
  type: "c,13,6,122,120,121,42,30,31,113,386",
  v_cr: "202301",
  qual: "10",
  stats: "sta",
} as const;

type FanGraphsRow = Record<string, unknown>;
type Period = "season" | "last 30 days";

export function buildFanGraphsPitcherUrl(month: 33 | 3) {
  const url = new URL(ENDPOINT);
  for (const [key, value] of Object.entries(CONFIRMED_QUERY)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("month", String(month));
  return url;
}

function canonicalValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function finiteNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function strikeRate(row: FanGraphsRow) {
  const strikes = finiteNumber(row.Strikes);
  const pitches = finiteNumber(row.Pitches);
  return strikes === null || pitches === null || pitches <= 0
    ? null
    : strikes / pitches;
}

function parseRows(text: string, period: Period): FanGraphsRow[] {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new DataIngestionError(
      "mlb_pitchers",
      "transform",
      `MLB pitchers: FanGraphs ${period} response was not valid JSON. Try again.`,
      "FANGRAPHS_JSON_INVALID",
    );
  }
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : null;
  if (!rows || rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
    throw new DataIngestionError(
      "mlb_pitchers",
      "transform",
      `MLB pitchers: FanGraphs ${period} response did not contain a usable row list. Try again.`,
      "FANGRAPHS_SHAPE_INVALID",
    );
  }
  return rows as FanGraphsRow[];
}

async function fetchPeriod(
  period: Period,
  month: 33 | 3,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  try {
    const text = await fetchBoundedText(
      "mlb_pitchers",
      buildFanGraphsPitcherUrl(month).toString(),
      signal,
      fetcher,
    );
    return { rows: parseRows(text, period), fetchedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof DataIngestionError && error.stage === "transform") throw error;
    throw new DataIngestionError(
      "mlb_pitchers",
      "fetch",
      `MLB pitchers: FanGraphs ${period} request failed. Try again or check FanGraphs availability.`,
      "FANGRAPHS_FETCH_FAILED",
    );
  }
}

function hand(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized === "R") return "RHP";
  if (normalized === "L") return "LHP";
  return normalized;
}

function directMetrics(row: FanGraphsRow, prefix = ""): CanonicalRow {
  return {
    [`${prefix}IP`]: canonicalValue(row.IP),
    [`${prefix}ERA`]: canonicalValue(row.ERA),
    [`${prefix}SIERA`]: canonicalValue(row.SIERA),
    [`${prefix}K%`]: canonicalValue(row["K%"]),
    [`${prefix}BB%`]: canonicalValue(row["BB%"]),
    [`${prefix}WHIP`]: canonicalValue(row.WHIP),
    [`${prefix}Strike%`]: strikeRate(row),
    [`${prefix}SwStr%`]: canonicalValue(row["SwStr%"]),
    [`${prefix}Stuff+`]: canonicalValue(row.sp_stuff),
  };
}

export class FanGraphsPitcherAdapter implements DatasetAdapter {
  readonly key = "mlb_pitchers" as const;

  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async load(signal: AbortSignal): Promise<AdapterOutput> {
    const [season, last30] = await Promise.all([
      fetchPeriod("season", 33, signal, this.fetcher),
      fetchPeriod("last 30 days", 3, signal, this.fetcher),
    ]);
    const last30ByName = new Map<string, FanGraphsRow>();
    for (const row of last30.rows) {
      const name = typeof row.PlayerName === "string" ? row.PlayerName.trim() : "";
      if (!name) continue;
      if (last30ByName.has(name)) {
        throw new DataIngestionError(
          this.key,
          "transform",
          `MLB pitchers: FanGraphs last 30 days returned duplicate player ${name}.`,
          "FANGRAPHS_L30_DUPLICATE",
        );
      }
      last30ByName.set(name, row);
    }

    const rows = season.rows.map((row) => {
      const player = typeof row.PlayerName === "string" ? row.PlayerName.trim() : "";
      const recent = last30ByName.get(player);
      return {
        Player: player,
        Team: canonicalValue(row.TeamNameAbb),
        Hand: hand(row.Throws),
        ...directMetrics(row),
        ...directMetrics(recent ?? {}, "L30 "),
      } satisfies CanonicalRow;
    });

    return {
      rows,
      sourceLabel: "FanGraphs",
      sourceTimestamp: null,
      sourceDetails: {
        query: { ...CONFIRMED_QUERY },
        season: { month: 33, fetchedAt: season.fetchedAt, rowCount: season.rows.length },
        last30: { month: 3, fetchedAt: last30.fetchedAt, rowCount: last30.rows.length },
        canonicalRowCount: rows.length,
        seasonYear: 2026,
      },
    };
  }
}
