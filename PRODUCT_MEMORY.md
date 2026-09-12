# Product memory

Manager maintains this file. Link material updates to decisions or user instructions; preserve superseded decisions in decisions/.

## Confirmed by the user
- Project name: Stream Starters.
- Website repository: C:/Users/jonro/stream-starters (provided in this setup session).
- Roles: Architect, Coder, Tester, Manager; agents should challenge one another and communicate through shared artifacts.
- User retains final authority. Work is needed while the user is online; no 24/7 setup is required.
- Initial deliverable: this framework, handoffs, authority and escalation rules.

Source: current setup request and referenced conversation Designing AI Agent Framework (ID 6aa0baa3-0aec-83e9-a61e-fb23ce565bc6). Earlier assistant examples are not confirmed requirements.

## Observed in repository, 2026-09-12
- package.json: Next.js 16.3.1, React 19.2.8, TypeScript, Tailwind CSS 4, Supabase client, html-to-image. These are declared dependencies, not a live deployment audit.
- app/page.tsx: Stream Starters fantasy sports homepage.
- Routes: /baseball/pitchers, /baseball/hitters, /baseball/hitters/rankings, /football, /football/rb, /football/rb/matchup.
- Pitcher, hitter, and RB matchup pages fetch published Google Sheets CSV data.
- app/api/hitter-rankings/route.ts uses Supabase with Elo-based hitter ranking logic; lib/supabaseAdmin.ts is the server helper.
- package scripts: npm run dev, npm run build, npm run start, npm run lint. No dedicated test script is declared.
- Existing AGENTS.md requires reading relevant bundled Next.js docs before code changes; preserve that guidance.
- A .vercel directory exists, but the live URL and deployed state have not been verified.
- Existing application working tree was clean at setup inspection. Environment file contents were not read.

## Unknown until a task requires them
- First feature and its acceptance criteria; authoritative business/scoring rules.
- Data update cadence, production database/testing boundaries, live website URL.
- Formal brand guidelines and social/content publishing authorization.

## Operating defaults
Use WORKFLOW.md. Preserve existing website behavior unless the user requests a change. Inspect relevant code and documentation for each task; this memory is a starting map, not complete product knowledge. Treat external data and previous assistant suggestions as reference material.

## Decision index
- [D-0001: framework repository location](decisions/D-0001-framework-location.md).
