import assert from "node:assert/strict";
import test from "node:test";
import { buildRbPeriodSnapshot, type RbWeeklyRow } from "../lib/data/rbWeekly.ts";

const row = (name: string, games: number, attempts: number, yards: number, fp: number, yac = "2") => ({
  Name: name, Team: "BUF", G: String(games), ATT: String(attempts), RuYds: String(yards), RuTD: "1",
  "Rush FUM": "0", Targets: "10", Rec: "8", "Rec Yards": "80", "Rec. TD": "1", "Rec FUM": "0",
  "Weighted Opp.": String(attempts + 20), FP: String(fp), "Total TD": "2", "Ins. 5 Carries": "1",
  "Ins. 10 Carries": "2", "Ins. 10 Rec.": "1", "1+ RuYd%": "90%", "3+ RuYd%": "60%",
  "5+ RuYd%": "40%", "10+ RuYd%": "20%", "15+ RuYd%": "10%", "20+ RuYd%": "5%",
  "30+ RuYd%": "0%", "Target Share": "20%", "Team Rec Yards %": "20%", "Inside 5 Carry%": "20%",
  "Inside 10 Carry%": "20%", "YAC/Att": yac,
}) satisfies RbWeeklyRow;

test("RB period snapshots use only players and metrics with a historical baseline", () => {
  const period = buildRbPeriodSnapshot(
    { week: 6, copiedAt: "week-6", rows: [row("Existing", 6, 60, 300, 90), row("New", 6, 50, 250, 70)] },
    { week: 3, copiedAt: "week-3", rows: [row("Existing", 3, 24, 100, 30, "")] },
    4,
  );
  assert.equal(period.rows.length, 1);
  assert.equal(period.rows[0].Name, "Existing");
  assert.equal(period.rows[0].G, "3");
  assert.equal(period.rows[0].ATT, "36");
  assert.equal(period.rows[0]["RuYds/G"], String(200 / 3));
  assert.equal(period.rows[0]["FP/G"], "20");
  assert.equal(period.rows[0]["YAC/Att"], "");
});
