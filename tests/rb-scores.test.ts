import assert from "node:assert/strict";
import test from "node:test";
import { ageAdjustedRushScore, calculateRbScores } from "../lib/data/rbScores.ts";

test("age factors preserve the supplied discontinuities, cap and missing values", () => {
  assert.equal(ageAdjustedRushScore(80, 22), 80);
  assert.equal(ageAdjustedRushScore(80, 26), 96);
  assert.equal(ageAdjustedRushScore(80, 29), 58);
  assert.equal(ageAdjustedRushScore(95, 26), 100);
  assert.equal(ageAdjustedRushScore(80, 20), 91);
  assert.equal(ageAdjustedRushScore(80, 36), 40);
  assert.equal(ageAdjustedRushScore(80, null), null);
});

test("opportunity uses all six weights and lowest rank for ties", () => {
  const base = {"Weighted Opp./G": 0, "Target Share": 0, "Inside 10 Carry%": 0, "Ins. 5 Carries": 0, "Ins. 10 Rec.": 0, "Total TD": 0};
  const high = Object.fromEntries(Object.keys(base).map(k => [k, 10]));
  const rows = [base, {...base, "Weighted Opp./G": 10}, high];
  const result = calculateRbScores({season: 2026, ageColumn: "2026 Age", rows});
  assert.equal(result[0].opportunity, 0);
  assert.equal(result[1].opportunity, 18);
  assert.equal(result[2].opportunity, 83);
  assert.equal(result[2].receiving, null);
  assert.equal(result[2].season, 2026);
  assert.equal(calculateRbScores({season: 2025, ageColumn: "2026 Age", rows: [high]})[0].opportunity, null);
});

test("only rush gain substitutes a dash with zero; blank inputs stay missing", () => {
  const columns = ["1+ RuYd%", "3+ RuYd%", "5+ RuYd%", "10+ RuYd%", "15+ RuYd%", "20+ RuYd%", "30+ RuYd%"];
  const rows = [Object.fromEntries(columns.map(k => [k, "-"])), Object.fromEntries(columns.map(k => [k, "10%"])), {}];
  const result = calculateRbScores({season: 2026, ageColumn: "2026 Age", rows});
  assert.equal(result[0].rushGain, 0);
  assert.equal(result[1].rushGain, 100);
  assert.equal(result[2].rushGain, null);
  assert.equal(result[0].rush, null);
});
