import assert from "node:assert/strict";
import test from "node:test";
import { buildRerankedRatings, makeRankingNamesUnique, moveRankingItem } from "../lib/hitterRankings/reorder.ts";

const items = [
  { playerName: "Alpha", currentElo: 1520 },
  { playerName: "Bravo", currentElo: 1500 },
  { playerName: "Charlie", currentElo: 1480 },
];

test("moveRankingItem applies a drop exactly once", () => {
  const moved = moveRankingItem(items, "Alpha", "Charlie");
  assert.deepEqual(moved.map((item) => item.playerName), ["Bravo", "Charlie", "Alpha"]);
  assert.deepEqual(items.map((item) => item.playerName), ["Alpha", "Bravo", "Charlie"]);
});

test("moveRankingItem ignores invalid and same-row drops", () => {
  assert.deepEqual(moveRankingItem(items, "Alpha", "Alpha"), items);
  assert.deepEqual(moveRankingItem(items, "Missing", "Bravo"), items);
});

test("buildRerankedRatings assigns descending Elo in the chosen order", () => {
  const reordered = moveRankingItem(items, "Charlie", "Alpha");
  assert.deepEqual(buildRerankedRatings(reordered), [
    { playerName: "Charlie", elo: 1520 },
    { playerName: "Alpha", elo: 1500 },
    { playerName: "Bravo", elo: 1480 },
  ]);
});

test("buildRerankedRatings creates visible spacing when all Elo values match", () => {
  assert.deepEqual(buildRerankedRatings([
    { playerName: "Alpha", currentElo: 1500 },
    { playerName: "Bravo", currentElo: 1500 },
  ]), [
    { playerName: "Alpha", elo: 1500 },
    { playerName: "Bravo", elo: 1490 },
  ]);
});


test("makeRankingNamesUnique disambiguates same-name hitters by team", () => {
  const players = makeRankingNamesUnique([
    { Name: "Max Muncy", Team: "LAD" },
    { Name: "Max Muncy", Team: "ATH" },
    { Name: "Mookie Betts", Team: "LAD" },
  ]);

  assert.deepEqual(players.map((player) => player.Name), [
    "Max Muncy (LAD)",
    "Max Muncy (ATH)",
    "Mookie Betts",
  ]);
});
