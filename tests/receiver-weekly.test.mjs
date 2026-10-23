import assert from "node:assert/strict";
import test from "node:test";
import { upsertReceiverWeeklySnapshot } from "../scripts/receiver-weekly.mjs";
import { buildReceiverPeriodSnapshot } from "../lib/data/receiverWeekly.ts";

const source = "receiver-source";
const row = (name, games) => ({ Name: name, POS: "WR", G: String(games) });

test("receiver weekly archive appends and replaces the detected week", () => {
  const base = { season: 2026, source, weeks: [{ week: 3, copiedAt: "old", population: { WR: 1, TE: 0 }, rows: [row("A", 3)] }] };
  const result = { copiedAt: "new", population: { WR: 2, TE: 0 }, rows: [row("A", 4), row("B", 4)] };
  const appended = upsertReceiverWeeklySnapshot(base, result, source);
  assert.equal(appended.week, 4);
  assert.deepEqual(appended.archive.weeks.map((item) => item.week), [3, 4]);
  const replacement = upsertReceiverWeeklySnapshot(appended.archive, { ...result, copiedAt: "newer", rows: [row("A", 4)] }, source);
  assert.equal(replacement.archive.weeks.length, 2);
  assert.equal(replacement.archive.weeks.at(-1).rows.length, 1);
});

test("receiver weekly archive remains unchanged for identical rows", () => {
  const result = { copiedAt: "new", population: { WR: 1, TE: 0 }, rows: [row("A", 4)] };
  const archive = { season: 2026, source, weeks: [{ week: 4, copiedAt: "old", population: result.population, rows: result.rows }] };
  assert.equal(upsertReceiverWeeklySnapshot(archive, result, source).changed, false);
});

test("receiver period snapshots subtract cumulative counts and rebuild rates", () => {
  const make = (week, values) => ({
    week,
    copiedAt: `week-${week}`,
    population: { WR: 1, TE: 0 },
    rows: [{
      Name: "Player", POS: "WR", Team: "BUF", G: String(values.games), Targets: String(values.targets),
      Rec: String(values.receptions), "Rec Yards": String(values.yards), "Rec TD": "0", i10: "0",
      "i20 Targets": "0", FUM: "0", FP: String(values.fp), "Routes Run": String(values.routes),
      Receptions: String(values.receptions), "Rec. Yards": String(values.yards), Touchdowns: "0",
      YAC: String(values.yac), "Total EPA": "0", "Impact Plays": "0", "Target Share": "20%",
      "Team Rec Yards %": "20%", "Team TD %": "0%",
    }],
  });
  const period = buildReceiverPeriodSnapshot(
    make(4, { games: 4, targets: 10, receptions: 8, yards: 100, fp: 30, routes: 40, yac: 40 }),
    make(3, { games: 3, targets: 6, receptions: 4, yards: 40, fp: 12, routes: 20, yac: 12 }),
  );
  assert.deepEqual(
    Object.fromEntries(["G", "Targets", "Rec", "Rec Yards", "Targets/G", "Routes/G", "YPR", "YPT", "FP/G", "Targets/Route Run", "YPRR", "YAC/Rec"].map((key) => [key, period.rows[0][key]])),
    { G: "1", Targets: "4", Rec: "4", "Rec Yards": "60", "Targets/G": "4.00", "Routes/G": "20.00", YPR: "15.00", YPT: "15.00", "FP/G": "18.0", "Targets/Route Run": "0.20", YPRR: "3.00", "YAC/Rec": "7.00" },
  );
});

test("receiver period snapshots leave routes blank when a historical endpoint is missing", () => {
  const player = (name, games, routes) => ({
    Name: name, POS: "WR", Team: "BUF", G: String(games), Targets: "10", Rec: "8", "Rec Yards": "100",
    "Rec TD": "1", i10: "1", "i20 Targets": "1", FUM: "0", FP: "30", "Routes Run": routes,
    Receptions: "8", "Rec. Yards": "100", Touchdowns: "1", YAC: routes ? "40" : "", "Total EPA": "0",
    "Impact Plays": "0", "Target Share": "20%", "Team Rec Yards %": "20%", "Team TD %": "20%",
  });
  const period = buildReceiverPeriodSnapshot(
    { week: 6, copiedAt: "week-6", population: { WR: 2, TE: 0 }, rows: [player("Existing", 6, "180"), player("New", 6, "150")] },
    { week: 3, copiedAt: "week-3", population: { WR: 1, TE: 0 }, rows: [player("Existing", 3, "")] },
  );
  assert.equal(period.rows.length, 1);
  assert.equal(period.rows[0].Name, "Existing");
  assert.equal(period.rows[0]["Routes Run"], "");
  assert.equal(period.rows[0]["Routes/G"], "");
  assert.equal(period.rows[0].YPRR, "");
});

test("receiver period snapshots cap games to the selected window and keep corrected rates stable", () => {
  const make = (week, games, targets, routes) => ({
    week, copiedAt: `week-${week}`, population: { WR: 1, TE: 0 }, rows: [{
      Name: "Late Snapshot", POS: "WR", Team: "BUF", G: String(games), Targets: String(targets),
      Rec: String(targets), "Rec Yards": String(targets * 10), "Rec TD": "0", i10: "0", "i20 Targets": "0",
      FUM: "0", FP: String(targets), "Routes Run": String(routes), Receptions: String(targets),
      "Rec. Yards": String(targets * 10), Touchdowns: "0", YAC: String(targets * 2), "Total EPA": "0",
      "Impact Plays": "0", "Target Share": "20%", "Team Rec Yards %": "20%", "Team TD %": "0%",
    }],
  });
  const period = buildReceiverPeriodSnapshot(make(6, 6, 24, 120), make(3, 2, 8, 40));
  assert.equal(period.rows[0].G, "3");
  assert.equal(period.rows[0].Targets, "12");
  assert.equal(period.rows[0]["Targets/G"], "4.00");
  assert.equal(period.rows[0]["Routes/G"], "20.00");
});

test("receiver period snapshots do not invent routes from target pace", () => {
  const receiver = (name, games, targets, routes) => ({
    Name: name, POS: "TE", Team: "TEN", G: String(games), Targets: String(targets), Rec: String(targets),
    "Rec Yards": String(targets * 10), "Rec TD": "0", i10: "0", "i20 Targets": "0", FUM: "0",
    FP: String(targets), "Routes Run": routes, Receptions: String(targets), "Rec. Yards": String(targets * 10),
    Touchdowns: "0", YAC: "", "Total EPA": "0", "Impact Plays": "0", "Target Share": "10%",
    "Team Rec Yards %": "10%", "Team TD %": "0%",
  });
  const end = { week: 6, copiedAt: "week-6", population: { WR: 0, TE: 2 }, rows: [
    receiver("Known", 6, 12, "60"), receiver("Missing", 6, 6, ""),
  ] };
  const baseline = { week: 5, copiedAt: "week-5", population: { WR: 0, TE: 2 }, rows: [
    receiver("Known", 5, 10, "50"), receiver("Missing", 5, 4, ""),
  ] };
  const period = buildReceiverPeriodSnapshot(end, baseline);
  const missing = period.rows.find((entry) => entry.Name === "Missing");
  assert.equal(missing["Routes Run"], "");
  assert.equal(missing["Routes/G"], "");
  assert.equal(missing["Routes Estimated"], undefined);
});
