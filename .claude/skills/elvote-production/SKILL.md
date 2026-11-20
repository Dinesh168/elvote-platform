---
name: elvote-production
description: Production-grade quality bar (Definition of Done) for ElVote Android, iOS and Web apps and a scalable backend. Use when writing specs, tests or code for any change, before marking anything done, and before any release or store submission. Covers security, privacy, reliability, offline, performance, backend scalability (stateless API, Postgres scaling, caching, queues, load tests), testing, accessibility, i18n, observability, CI/CD and app-store compliance.
---

# ElVote production standard

The owner wants a **proper production app**, not a prototype. Every change must meet this bar. Apply it in the `elvote-change` workflow: in **specs** (non-functional requirements), **test cases** (one TC per relevant item), **code**, and the **verify/ship** gates. If a change can't meet an item, say so explicitly in the spec under "Known gaps" and get the user's OK.

## 1. Security (blocking)

- [ ] Every request value goes into SQL as a **bound parameter** (`?` / `??`), never interpolated. Validate inputs with `zod`/`joi` at the route (ints, enums, lengths, arrays).
- [ ] Authorization on the server for every route: caller from `res.locals`; account, constituency (`constituency_account_mapping`) and booth scope checked. Volunteers only see their booth(s). There's a test for "user A cannot access tenant B".
- [ ] No secrets in git: `.env`, Firebase Admin key, keystores and API keys all go through EAS secrets or server env. Client-side keys are restricted (Maps key by package/SHA, Firebase via App Check).
- [ ] HTTPS only; CORS allow-list; `helmet`; rate limiting on auth, OTP and pass-key routes; body size limits.
- [ ] Destructive operations need a role check + explicit confirmation + an audit log entry.
- [ ] Dependencies: `npm audit` with no high/critical issues at release.

## 2. Privacy & compliance (India DPDP Act 2023 + store policies)

- [ ] Voter PII (caste, religion, opinion, phone) is never logged, sent to analytics, cached unencrypted beyond need, or exported without a role check.
- [ ] Privacy policy URL + in-app consent text. A data-retention rule is defined per table.
- [ ] **In-app account deletion** (required by both Google Play and the App Store).
- [ ] Play Console *Data safety* and iOS *Privacy Nutrition Label* + `PrivacyInfo.xcprivacy` filled in to match actual data use.
- [ ] Only the permissions actually used are requested, each with a rationale (camera for QR, contacts never unless a spec says so).

## 3. Reliability & offline

- [ ] Every screen has loading, empty, error (with Retry) and offline states.
- [ ] Canvassing writes are **queued offline**, idempotent on the server (upsert per voter) and retried with backoff; the user sees sync status.
- [ ] API errors map to friendly, translated messages. No raw error text and no stuck spinners. Timeouts are 15 s.
- [ ] Token refresh is automatic. A 401 leads to a clean re-login, with nothing lost from the queue.
- [ ] DB changes go through migrations (including loops over dynamic tables), are idempotent and backward compatible with the currently released app (no breaking API changes without versioning).

## 4. Performance budgets

| Metric | Budget (mid-range Android, 4G) |
|---|---|
| Cold start to usable Home | < 2.5 s |
| Screen transition | < 300 ms, 60 fps scrolling |
| Voter list of 1,500 rows | smooth (FlashList, memoized rows) |
| API p95 (list/count) | < 500 ms; every query on large tables uses an index |
| Android app download size | < 40 MB |
| Web first load (JS) | < 1 MB gzipped, code-split by route |

Check new queries on large tables with `EXPLAIN` against realistic data (~300k voters).

## 4b. Scalable backend (blocking for backend changes)

**Capacity target** (design for it now, even though today's load is small): **50+ constituencies × ~300k voters (≈ 15M voter rows), 10,000 concurrent volunteers on polling day, peak ~1,000 writes/s**, with dashboards at p95 < 500 ms.

- [ ] **Stateless API.** No local disk for app data: voter-slip images, party data, candidate photos and XLSX imports/exports go to object storage (DigitalOcean Spaces / S3). Nothing is held in process memory between requests. Any instance can serve any request.
- [ ] **Horizontal scale.** Run multiple instances (pm2 cluster mode → several droplets or containers behind a load balancer). Sessions are token-based only. Health check `/health` (DB ping) for the load balancer.
- [ ] **Database:**
  - connection pooling (PgBouncer, or the pooler built into Managed Postgres); Knex pool sized per instance
  - an index for every filter and join column, checked with `EXPLAIN ANALYZE` on realistic volume
  - **no new per-tenant dynamic tables.** Use single tables with `account_id` / `constituency_number` columns (partition `voters` by constituency) and composite indexes, so migrations stay normal
  - keyset (cursor) pagination for large lists instead of `OFFSET`
  - move to **DigitalOcean Managed PostgreSQL** with point-in-time recovery; add a read replica for dashboards and analytics when load requires it
- [ ] **Dashboard counters.** Don't run 30 separate `COUNT(*)` queries per dashboard load. Use one aggregate query per screen (`COUNT(*) FILTER (WHERE …)`), plus pre-aggregated per-booth counters (summary table updated on write, or a materialized view refreshed every 1–5 min) and a short-TTL Redis cache keyed by tenant + filters.
- [ ] **Async jobs.** Long work (roll XLSX import of 300k rows, exports, bulk WhatsApp slip images) runs in a background queue (BullMQ + Redis) with progress status. Request handlers never block for more than about 2 s.
- [ ] **Writes are idempotent and batched.** Offline sync sends batches, each with a client-generated id, so a retry never duplicates.
- [ ] **Shared Redis** for cache, rate limits and queues (in-memory state breaks with more than one instance).
- [ ] **API versioning** (`/api/v1`) so old app versions in the field keep working during rollouts.
- [ ] **Load test before every election-season release.** k6 scripts in `backend/loadtest/` simulate polling-day traffic. A release passes when it meets the capacity target on staging.

## 5. Testing & CI (blocking)

- [ ] Unit + component tests for all new logic and components; backend API tests (supertest + test Postgres) for every endpoint, including auth and tenant-isolation cases.
- [ ] E2E for critical flows: login/onboarding, find voter → mark group, offline mark → sync, polling-day mark voted, admin approve volunteer. Maestro on Android/iOS, Playwright on web.
- [ ] Coverage: ≥ 80% lines on changed code; 100% of spec acceptance criteria have a TC.
- [ ] CI (GitHub Actions) on every PR: typecheck, lint, unit, API tests, web build. Merge is blocked if any fail.

## 6. Accessibility, UX & i18n

- [ ] The `elvote-ui` checklist passes (low-literacy rules, touch sizes, icon + word).
- [ ] WCAG 2.2 AA contrast; screen-reader labels; works at 130% font scale.
- [ ] All strings in i18n for English + every regional language in use. No hard-coded text. Devanagari and Gurmukhi render correctly.

## 7. Observability

- [ ] Crash and error reporting (Sentry) on app and backend, with PII scrubbing; source maps uploaded on release.
- [ ] Structured server logs (no PII), request ids, `/health` endpoint, uptime monitor.
- [ ] Product analytics are event-based without voter PII (e.g. `voter_marked`, never the voter's name).
- [ ] Targets: crash-free sessions ≥ 99.5%, API error rate < 1%.

## 8. Release engineering

- [ ] Semantic versioning; `app.json` version + `CHANGELOG.md` updated; git tag per release.
- [ ] Environments: **dev → staging → production**, with separate API URL, Firebase project and DB. Config via `app.config.ts` + `EXPO_PUBLIC_*` and EAS env.
- [ ] EAS Build profiles + **EAS Update** channels for OTA fixes (JS-only changes). Native changes require a store build.
- [ ] Store assets per release: icon, splash, screenshots (phone + tablet), localized descriptions (English + regional).
- [ ] Android: AAB, target the latest required API level, Play App Signing. iOS: bundle id, signing via EAS, TestFlight before the App Store.
- [ ] Web: static export behind CDN/HTTPS, SPA rewrites, cache headers.
- [ ] Backend deploy: `pg_dump` backup → migrate → `pm2 reload` (zero downtime) → smoke test → rollback plan written down. **Production changes only in a window the user approves.**
- [ ] Automated daily off-server DB backups, with a restore tested.

## 9. Definition of Done (paste into the PR)

```
- [ ] Spec + test cases updated (REQ-IDs ↔ TC-IDs)
- [ ] All tests pass in CI; coverage ≥ 80% on changed code
- [ ] Security & tenant-isolation checks pass; no secrets; npm audit clean
- [ ] Loading / empty / error / offline states done
- [ ] i18n complete (English + the configured regional language); a11y checklist passed
- [ ] Perf budgets met (list scroll, API p95, bundle)
- [ ] Backend scalability: stateless, indexed queries (EXPLAIN checked), no per-request counter storms, no new dynamic tables, async jobs for long work
- [ ] Load test passed on staging (for election-season releases)
- [ ] Verified on Web + Android (+ iOS build) with screenshots
- [ ] Docs updated (FEATURES / API / DATA_MODEL / CHANGELOG)
- [ ] Migration tested on a DB copy; rollback plan written
```
