import { calculateReceiverScores } from "../lib/data/receiverScores.ts";

const aliases = { ARZ: "ARI", BLT: "BAL", CLV: "CLE", HST: "HOU", LA: "LAR" };
const normalizeName = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const numeric = (value) => {
  const parsed = Number(String(value ?? "").replace(/[%,$]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export function transformReceiverReport(raw, sumerRows) {
  if (raw.season !== 2026 || raw.seasonType !== "Regular" || raw.scoring !== "PPR") throw Error("Unexpected receiver filters");
  const expected = ["", "Rank", "Name", "Team", "POS", "G", "TGT", "TGT %", "REC", "YDS", "TM YDS %", "YPR", "YPT", "RecYDS/G", "CR %", "TD", "TM TD %", "i10", "i20 TGT", "FUM", "FP/G", "FP"];
  const headers = [...new Map(raw.headers.map((header) => [header.id, header])).values()].filter((header) => Object.hasOwn(raw.rows[0], header.id));
  if (JSON.stringify(headers.map((header) => header.label)) !== JSON.stringify(expected)) throw Error("Receiver header mismatch");
  const mapped = ["_selection", "Rank", "Name", "Team", "POS", "G", "Targets", "Target Share", "Rec", "Rec Yards", "Team Rec Yards %", "YPR", "YPT", "RecYds/G", "Catch %", "Rec TD", "Team TD %", "i10", "i20 Targets", "FUM", "FP/G", "FP"];
  const sumer = new Map(sumerRows.map((row) => [`${row.POS}:${normalizeName(row.Name)}`, row]));
  const rows = raw.rows
    .map((source) => Object.fromEntries(headers.map((header, index) => [mapped[index], source[header.id]])))
    .filter((row) => row.POS === "WR" || row.POS === "TE")
    .map((row) => {
      delete row._selection;
      row.Team = aliases[row.Team] ?? row.Team;
      const extra = sumer.get(`${row.POS}:${normalizeName(row.Name)}`) ?? {};
      const games = Math.max(1, numeric(row.G));
      const routes = numeric(extra["Routes Run"]);
      const receptions = numeric(row.Rec);
      return {
        ...row,
        ...extra,
        Name: row.Name,
        Team: row.Team,
        POS: row.POS,
        "Targets/G": (numeric(row.Targets) / games).toFixed(2),
        "Routes/G": routes ? (routes / games).toFixed(2) : "",
        "i10/G": (numeric(row.i10) / games).toFixed(2),
        "i20/G": (numeric(row["i20 Targets"]) / games).toFixed(2),
        "YAC/Rec": receptions && extra.YAC != null && extra.YAC !== "" ? (numeric(extra.YAC) / receptions).toFixed(2) : "",
      };
    });
  for (const position of ["WR", "TE"]) {
    const group = rows.filter((row) => row.POS === position);
    const routeCoverage = group.filter((row) => row["Routes/G"] !== "").length / group.length;
    if (routeCoverage < 0.7) throw Error(`${position} route coverage is only ${(routeCoverage * 100).toFixed(1)}%`);
    const scores = calculateReceiverScores(group);
    group.forEach((row, index) => {
      row["Efficiency Grade"] = scores[index].efficiency === null ? "" : String(scores[index].efficiency);
      row["Opportunity Grade"] = scores[index].opportunity === null ? "" : String(scores[index].opportunity);
    });
  }
  const counts = Object.fromEntries(["WR", "TE"].map((position) => [position, rows.filter((row) => row.POS === position).length]));
  if (counts.WR < 100 || counts.TE < 40 || new Set(rows.map((row) => `${row.POS}:${row.Name}`)).size !== rows.length) throw Error(`Unexpected receiver population: ${JSON.stringify(counts)}`);
  return {
    season: 2026,
    source: raw.source,
    enrichmentSources: raw.enrichmentSources,
    copiedAt: raw.copiedAt,
    updateMode: "browser import",
    seasonType: "Regular",
    scoring: "PPR",
    population: counts,
    rows: rows.sort((a, b) => a.POS.localeCompare(b.POS) || a.Name.localeCompare(b.Name)),
  };
}
