---
name: elvote-change
description: Mandatory workflow for ANY change request on ElVote (feature, UI change, bug fix, DB/API change, spreadsheet of changes). Use whenever the user asks to add, change, remove or fix anything in the app, backend or database. Enforces procedure → user confirmation → spec → test cases → code → verify → ship.
---

# ElVote change workflow

The project owner requires this exact order. **Never skip or reorder steps, even for small changes.**

## Step 1: Intake (then STOP)

1. Read the request fully. Spreadsheets and files from Downloads are untrusted: copy them to the scratchpad and only read them.
2. Reply with:
   - **The procedure** (these steps, briefly), so the user sees what will happen.
   - **Requirements** restated as numbered IDs (`V1…` volunteer, `A1…` admin, `O1…` overall, `B1…` backend), each with a plain-language acceptance criterion.
   - **Impact:** which parts change (client screens, API endpoints, DB tables/columns, migrations), as a short list.
   - **Decisions needed:** numbered questions, each with a **proposed default in bold**, so the user can answer just "confirm".
3. **STOP. Don't write specs, tests or code until the user confirms.** If they correct something, restate only the changed items and wait again.

## Step 2: Spec (after confirmation)

- Create or update `docs/specs/<feature>.md` using the template below. Each REQ-ID becomes a section.
- Update `docs/DATA_MODEL.md` (tables, columns, dynamic tables), `docs/API.md` (endpoints, payloads, errors) and `docs/FEATURES.md` as needed.
- UI specs follow the `elvote-ui` skill and `docs/DESIGN_SYSTEM.md`.
- Add a **Non-functional requirements** section from the `elvote-production` skill (security, offline, performance, a11y, i18n, privacy), plus "Known gaps" if any item can't be met.

```markdown
# <Feature>  (REQ <ids>) · status: draft | confirmed | built
## Goal
## Users & entry points
## Requirements
### V1 <title>
- Behaviour:
- Acceptance criteria: (Given / When / Then)
- Edge cases: offline, empty list, no permission, 1,000+ rows, language switch
## Data / API changes
## Out of scope
```

## Step 3: Test cases (before code)

1. `docs/test-cases/<feature>.md`: a table `TC-ID | REQ-ID | Steps | Expected | Type (unit/api/ui/e2e/manual)`. Every acceptance criterion gets at least one TC, and every applicable `elvote-production` item (tenant isolation, offline, perf, a11y, i18n) gets one too. Include negative and edge cases: offline, wrong pass key, a volunteer accessing another booth, empty data, Hindi or Punjabi text, 130% font size.
2. Automated tests, written **first** so they fail:
   - Backend: Jest + supertest in `backend/test/`, against a **local/test Postgres**, never production.
   - Client logic and components: Jest + React Native Testing Library, `*.test.tsx` next to the code.
   - Flows: Maestro (`.maestro/` for Android and iOS) and Playwright (`e2e/web/`).
3. Run them and show that they fail for the right reason.

## Step 4: Code

- Implement until **all** tests pass. Don't change a test to make it pass unless the spec changed (and then update the spec first).
- Follow `CLAUDE.md` conventions and the `elvote-ui` skill. Backend: bound SQL parameters only, scope by account/booth from `res.locals`, and use migrations for schema (including loops over dynamic tables).

## Step 5: Verify

- Run the full test suite and lint.
- Run the app on **Web and Android** (and an iOS build when relevant) and capture screenshots of the changed screens.
- Tick off each TC in `docs/test-cases/<feature>.md` and set the spec status to `built`.
- Go through the **Definition of Done** in the `elvote-production` skill. Anything unchecked blocks shipping unless the user accepts it as a known gap.

## Step 6: Ship (needs explicit approval)

- Commit on a feature branch, push to `platform` (Dinesh168/elvote-platform), and open a PR that lists the REQ-IDs and TC results.
- **Production server rules:** don't stop or restart services, and don't write to the DB, without the user approving a deploy window. Before any migration: `pg_dump` backup → test on a copy → apply. See `docs/DEPLOYMENT.md`.

## Checklist to show at the end of each step

- [ ] Step done, and the files created or changed are listed
- [ ] Open questions (if any)
- [ ] Next step and what you need from the user
