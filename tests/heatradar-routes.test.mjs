import assert from "node:assert/strict";
import test from "node:test";
import { extendRouteArchive, parseHeatRadarRoutes } from "../scripts/refresh-heatradar-routes.mjs";

test("HeatRadar parser reads the embedded public route payload", () => {
  const html = '<script id="routes-data" type="application/json">{"season":2026,"weeks":[7],"players":[]}</script>';
  assert.deepEqual(parseHeatRadarRoutes(html), { season: 2026, weeks: [7], players: [] });
});

test("HeatRadar appends one weekly increment without rewriting prior cumulative routes", () => {
  const priorRows = [
    { Name: "Bye Player", POS: "WR", Team: "KC", G: "6", "Routes Run": "100" },
    { Name: "Active Player", POS: "TE", Team: "LA", G: "6", "Routes Run": "80" },
  ];
  const archive = { season: 2026, weeks: [{ week: 6, copiedAt: "old", rows: priorRows }] };
  const filler = Array.from({ length: 149 }, (_, index) => ({
    player: `Player ${index}`, position: "WR", team: "ARI", week: 7, routes: 1,
  }));
  const payload = {
    season: 2026,
    weeks: [1,2,3,4,5,6,7],
    players: [...filler, { player: "Active Player Jr.", position: "TE", team: "LA", week: 7, routes: 20 }],
  };
  const result = extendRouteArchive(archive, payload, "now");
  const week7 = result.archive.weeks.find((entry) => entry.week === 7);
  assert.equal(week7.rows.find((row) => row.Name === "Bye Player")["Routes Run"], "100");
  assert.equal(week7.rows.find((row) => row.Name === "Active Player Jr.")["Routes Run"], "100");
  assert.equal(week7.rows.find((row) => row.Name === "Active Player Jr.").Team, "LAR");
  assert.equal(week7.rows.filter((row) => row.Name.startsWith("Active Player")).length, 1);
  assert.equal(archive.weeks.length, 1);
});
