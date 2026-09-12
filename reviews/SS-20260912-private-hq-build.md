# SS-20260912-private-hq: Build handoff

- Status: IMPLEMENTED
- Baseline: 710f887
- Outputs: `proxy.ts`, `lib/hqAuth.ts`, HQ login/logout routes and UI, HQ sign-out control, homepage link removal
- Next owner: Tester

The proxy guards `/hq/:path*` and permits the login route. Login compares an HMAC of candidate and configured password, then issues a signed expiration token in an HTTP-only, secure, strict, `/hq`-scoped cookie. Redirect destinations are restricted to local HQ paths. Secrets are absent from source.

Production build passed. Focused ESLint passed with only pre-existing homepage image warnings.
