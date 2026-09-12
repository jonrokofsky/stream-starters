# SS-20260912-private-hq: Architect spec

- Status: READY FOR BUILD
- User outcome: only the owner can access Agent HQ
- Baseline: commit 710f887
- Next owner: Coder

## Scope
Protect `/hq` with a server-verified password and signed, HTTP-only session cookie. Keep `/hq/login` public, reject invalid passwords, support sign-out, remove public HQ links, and store all secrets only in Vercel production environment variables. Sports routes remain public.

## Acceptance criteria
1. Anonymous `/hq` requests redirect to `/hq/login`.
2. Wrong passwords are rejected without creating a session.
3. The configured password grants a seven-day, path-scoped session.
4. Sign-out clears access.
5. Neither password nor signing secret is present in tracked source.
6. Public homepage links to HQ are removed.
7. Production exhibits the same protection after deployment.
