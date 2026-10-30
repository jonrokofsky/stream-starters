import { readFile, rename, writeFile } from "node:fs/promises";

export const HEATRADAR_SOURCE = "https://heatradar.app/nfl/routes";
const SEASON = 2026;
const START_WEEK = 7;
const target = new URL(`../public/data/receiver-routes-weekly-${SEASON}.json`, import.meta.url);

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(?:jr|sr|iii|ii|iv)$/, "");
}

function identity(position, name) {
  return `${position}|${normalizeName(name)}`;
}

function normalizeTeam(team) {
  return team === "LA" ? "LAR" : String(team ?? "");
}

export function parseHeatRadarRoutes(html) {
  const marker = '<script id="routes-data" type="application/json">';
  const start = html.indexOf(marker);
  const end = html.indexOf("</script>", start);
  if (start < 0 || end < 0) throw new Error("HeatRadar route data block was not found");
  const payload = JSON.parse(html.slice(start + marker.length, end));
  if (payload.season !== SEASON || !Array.isArray(payload.weeks) || !Array.isArray(payload.players)) {
    throw new Error("HeatRadar route payload has an unexpected shape");
  }
  return payload;
}

export function extendRouteArchive(archive, payload, capturedAt = new Date().toISOString()) {
  const latestWeek = Math.max(...payload.weeks.map(Number).filter(Number.isInteger));
  if (!Number.isInteger(latestWeek) || latestWeek < START_WEEK) {
    return { archive, week: null, changed: false, playerCount: 0 };
  }

  const weeklyRows = payload.players.filter((row) =>
    Number(row.week) === latestWeek && ["WR", "TE"].includes(row.position)
  );
  if (weeklyRows.length < 150) throw new Error(`HeatRadar Week ${latestWeek} returned only ${weeklyRows.length} WR/TE rows`);

  const seen = new Set();
  for (const row of weeklyRows) {
    const rowIdentity = identity(row.position, row.player);
    if (!row.player || seen.has(rowIdentity)) throw new Error(`HeatRadar duplicate or blank player identity: ${row.player ?? ""}`);
    if (!Number.isInteger(row.routes) || row.routes < 0) throw new Error(`HeatRadar invalid Week ${latestWeek} route total for ${row.player}`);
    seen.add(rowIdentity);
  }

  const prior = archive.weeks?.find((entry) => entry.week === latestWeek - 1);
  if (!prior?.rows?.length) throw new Error(`Route archive is missing Week ${latestWeek - 1}; refusing to create a mixed cumulative snapshot`);

  const cumulative = new Map(prior.rows.map((row) => [
    identity(row.POS, row.Name),
    { ...row, "Routes Run": String(Math.round(Number(row["Routes Run"]) || 0)) },
  ]));
  for (const row of weeklyRows) {
    const rowIdentity = identity(row.position, row.player);
    const previous = cumulative.get(rowIdentity);
    cumulative.set(rowIdentity, {
      Name: row.player,
      POS: row.position,
      Team: normalizeTeam(row.team) || previous?.Team || "",
      G: previous?.G || "",
      "Routes Run": String((Number(previous?.["Routes Run"]) || 0) + row.routes),
    });
  }

  const next = {
    week: latestWeek,
    copiedAt: capturedAt,
    source: HEATRADAR_SOURCE,
    rows: [...cumulative.values()].sort((a, b) => a.POS.localeCompare(b.POS) || a.Name.localeCompare(b.Name)),
  };
  const previousCurrent = archive.weeks?.find((entry) => entry.week === latestWeek);
  const changed = !previousCurrent || JSON.stringify(previousCurrent.rows) !== JSON.stringify(next.rows);
  const nextArchive = {
    ...archive,
    season: SEASON,
    source: HEATRADAR_SOURCE,
    method: "Cumulative route totals: exact Fantasy Points Weeks 1-6; HeatRadar weekly charting appended from Week 7",
    provenance: [
      { weeks: "1-6", source: "https://fantasypointsdata.com/receiving/advanced" },
      { weeks: "7+", source: HEATRADAR_SOURCE },
    ],
    weeks: [...(archive.weeks ?? []).filter((entry) => entry.week !== latestWeek), next].sort((a, b) => a.week - b.week),
  };
  return { archive: nextArchive, week: latestWeek, changed, playerCount: next.rows.length };
}

async function main() {
  const response = await fetch(HEATRADAR_SOURCE, {
    headers: { "User-Agent": "Stream-Starters/1.0 route refresh" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HeatRadar returned HTTP ${response.status}`);
  const payload = parseHeatRadarRoutes(await response.text());
  const archive = JSON.parse(await readFile(target, "utf8"));
  const result = extendRouteArchive(archive, payload);
  if (result.week === null) {
    console.log("HeatRadar has no post-archive route week yet.");
    return;
  }
  if (result.changed) {
    const temporary = new URL(`${target.href}.tmp`);
    await writeFile(temporary, `${JSON.stringify(result.archive, null, 2)}\n`);
    await rename(temporary, target);
  }
  console.log(`HeatRadar Week ${result.week} route snapshot ${result.changed ? "updated" : "unchanged"}: ${result.playerCount} cumulative WR/TE rows.`);
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`).href) {
  await main();
}
