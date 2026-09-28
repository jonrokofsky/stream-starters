import assert from "node:assert/strict";
import test from "node:test";
import { calculateReceiverScores } from "../lib/data/receiverScores.ts";

test("receiver efficiency and opportunity grades rank within one position pool", () => {
  const low = { YPRR: 1, YPT: 5, "YAC/Rec": 2, "RecYds/G": 20, YPR: 7, "Target Share": "10%", "Targets/Route Run": 0.1, "Routes/G": 15, "i20/G": 0, "i10/G": 0, "Team Rec Yards %": "10%", "Rec TD": 0 };
  const mid = { YPRR: 2, YPT: 8, "YAC/Rec": 5, "RecYds/G": 60, YPR: 12, "Target Share": "20%", "Targets/Route Run": 0.2, "Routes/G": 30, "i20/G": 1, "i10/G": 0.5, "Team Rec Yards %": "20%", "Rec TD": 2 };
  const high = { YPRR: 3, YPT: 11, "YAC/Rec": 8, "RecYds/G": 100, YPR: 17, "Target Share": "30%", "Targets/Route Run": 0.3, "Routes/G": 45, "i20/G": 2, "i10/G": 1, "Team Rec Yards %": "30%", "Rec TD": 5 };
  const result = calculateReceiverScores([low, mid, high]);
  assert.deepEqual(result.map((item) => item.efficiency), [0, 50, 100]);
  assert.deepEqual(result.map((item) => item.opportunity), [0, 50, 100]);
});

test("receiver grades reweight available metrics but require three inputs", () => {
  const rows = [
    { YPRR: 1, YPT: 5, "RecYds/G": 20 },
    { YPRR: 2, YPT: 10, "RecYds/G": 80 },
  ];
  const result = calculateReceiverScores(rows);
  assert.equal(result[0].efficiency, 0);
  assert.equal(result[1].efficiency, 100);
  assert.equal(result[0].opportunity, null);
});
