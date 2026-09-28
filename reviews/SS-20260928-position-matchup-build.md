# SS-20260928-position-matchup — build handoff

- Author/role: Coder (sequential pass)
- Date: 2026-09-28
- Status: READY FOR QA
- Spec: `specs/SS-20260928-position-matchup.md`
- Revision under review: `12e8a33` (after feature revision `a04f85f`)
- Application: Stream Starters Next.js app
- Next owner: Tester

## Implementation

- Expanded `app/football/rb/matchup/page.tsx` to load receiver profiles, provide RB/WR/TE selection, render position-specific player cards, and choose the matching defense fields.
- Added canonical `/football/matchup` page while retaining the prior route.
- Renamed the defense-only page and updated homepage/profile navigation labels and links.

## Verification handed to QA

- `npx eslint` on the five changed source pages: zero errors; existing unused-helper and `<img>` warnings remain.
- Production build with placeholder Supabase build variables: passed; both matchup routes were statically generated.
- Browser smoke test on port 3011: RB, WR, and TE each selected a player, showed the correct position label and defense badge, and rendered defense cards. `/football` and homepage headings matched the new names.
- All 26 data-foundation tests passed.
- Follow-up: RB YAC/attempt and WR/TE YPRR, YAC/reception, and routes/game cards now calculate position-relative percentiles and use the shared red-to-blue style with `P##` badges.
