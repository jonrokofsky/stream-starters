# SS-20260928-position-matchup — QA

- Author/role: Tester (sequential, not independent)
- Date: 2026-09-28
- Status: PASS
- Spec: `specs/SS-20260928-position-matchup.md`
- Revision: `12e8a33` (after feature revision `a04f85f`)
- Environment: local production build served on `http://localhost:3011`
- Next owner: Manager

## Results

- AC-1 PASS: RB, WR, and TE toggles selected Aaron Jones, A.J. Brown, and Adam Trautman respectively in the smoke test; labels matched each position.
- AC-2 PASS: RB-specific cards remain in the RB rendering branch.
- AC-3 PASS: WR/TE render efficiency and opportunity grades plus YPRR, YAC/reception, and routes/game from the receiver row.
- AC-4 PASS: code maps the selected position to its matching defense snapshot fields; browser showed matching defense badges and cards for all positions.
- AC-5 PASS: inspected combined and receiver profile formulas.
- AC-6 PASS: production build generated `/football/matchup` and `/football/rb/matchup`.
- AC-7 PASS: browser observed “Defense vs Position” on `/football` and both distinct homepage cards.
- AC-8 PASS: production build completed and browser interaction smoke test completed with no application exceptions. External ESPN logo requests were blocked by the restricted test network; this did not affect data or controls.
- AC-9 PASS: browser inspection found percentile badges and matching style classes for RB YAC/attempt and every WR/TE raw player card. The sample covered red, blue, and neutral outcomes.

No blocking or nonblocking product issues found. Full-repository lint still has unrelated pre-existing baseball errors; focused lint for changed files has zero errors.

Hosted verification: Vercel served `/football/matchup` with the RB/WR/TE controls and `/football` with the “Defense vs Position” heading after the push.
