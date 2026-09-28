import assert from "node:assert/strict";
import test from "node:test";
import { upsertWeeklySnapshot } from "../scripts/rb-weekly.mjs";

const source = "https://data.fantasypoints.com/nfl/tools/player/rushing-basic";
const week2 = { week: 2, copiedAt: "2026-09-21T12:00:00Z", rows: [{ Name: "A", G: "2" }] };

test("weekly archive appends and replaces the detected week", () => {
  const initial = { season: 2026, source, weeks: [week2] };
  const week3 = { copiedAt: "2026-09-28T12:00:00Z", rows: [{ Name: "A", G: "3" }] };
  const appended = upsertWeeklySnapshot(initial, week3, source);
  assert.equal(appended.changed, true);
  assert.deepEqual(appended.archive.weeks.map((item) => item.week), [2, 3]);

  const revised = { ...week3, copiedAt: "2026-09-29T12:00:00Z", rows: [{ Name: "A", G: "3" }, { Name: "B", G: "3" }] };
  const replaced = upsertWeeklySnapshot(appended.archive, revised, source);
  assert.equal(replaced.archive.weeks.length, 2);
  assert.equal(replaced.archive.weeks[1].rows.length, 2);
});

test("weekly archive stays unchanged for identical rows", () => {
  const initial = { season: 2026, source, weeks: [week2] };
  const result = upsertWeeklySnapshot(initial, { copiedAt: "later", rows: week2.rows }, source);
  assert.equal(result.changed, false);
  assert.equal(result.archive, initial);
});
