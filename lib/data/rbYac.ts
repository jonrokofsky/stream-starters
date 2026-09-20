type Row = Record<string, string>;
export type YacSnapshot = { season: number; source: string; capturedAt: string; coverageNote: string; rows: Row[] };
function identity(name: string, team: string) {
  const normalized = name.toLowerCase().replace(/\b(jr|sr|iii|ii|iv)\b/g, "").replace(/[^a-z]/g, "");
  return (normalized === "kennygainwell" ? "kennethgainwell" : normalized) + ":" + team;
}
export function mergeRbYac(rows: Row[], snapshot: unknown): Row[] {
  const s = snapshot as YacSnapshot | null;
  if (!s || s.season !== 2026 || !Array.isArray(s.rows) || !s.rows.length ||
      typeof s.capturedAt !== "string" || !Number.isFinite(Date.parse(s.capturedAt)) ||
      typeof s.coverageNote !== "string" ||
      s.source !== "https://www.pro-football-reference.com/years/2026/rushing_advanced.htm") throw Error("Invalid PFR snapshot");
  const lookup = new Map<string, string>();
  for (const row of s.rows) {
    if (typeof row.Name !== "string" || !row.Name.trim() || typeof row.Team !== "string" ||
        typeof row["YAC/Att"] !== "string" || !/^\d+(\.\d+)?$/.test(row["YAC/Att"])) throw Error("Invalid YAC row");
    const key = identity(row.Name, row.Team);
    if (lookup.has(key)) throw Error("Ambiguous PFR player");
    lookup.set(key, row["YAC/Att"]);
  }
  return rows.map(row => ({ ...row, "YAC/Att": lookup.get(identity(row.Name, row.Team)) ?? "" }));
}
