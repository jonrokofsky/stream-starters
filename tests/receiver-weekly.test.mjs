import assert from "node:assert/strict";
import test from "node:test";
import { upsertReceiverWeeklySnapshot } from "../scripts/receiver-weekly.mjs";

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
