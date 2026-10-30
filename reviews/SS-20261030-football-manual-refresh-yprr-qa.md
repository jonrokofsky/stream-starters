# SS-20261030-football-manual-refresh-yprr — QA

- Author/role: Tester (sequential pass; not independent)
- Date: 2026-10-30
- Status: PASS
- Revision: build handoff revision
- Next owner: Manager

- AC-1 PASS: all three football workflows expose manual dispatch only; baseball schedule remains unchanged.
- AC-2 PASS: suffix regression test merges prior Active Player with Active Player Jr.; live route archive reduced duplicate identities from 336 to 327.
- AC-3 PASS: current and interval data enforce 10 routes/game. Screenshot examples were spot-checked.
- AC-4 PASS: no app/page files changed.
- AC-5 PASS: public/1.png remains untracked.
- Checks: focused route/window tests 9/9; data tests 26/26; focused lint clean; 18-route production build passed.
