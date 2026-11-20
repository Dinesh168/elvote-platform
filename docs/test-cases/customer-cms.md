# Test cases: customer CMS, users, vote trace (spec `docs/specs/customer-cms.md`)

Status: ⬜ not run · ✅ pass · ❌ fail. api = vitest (test DBs); unit = Jest; ui = puppeteer.

| ID | Req | Type | Steps | Expected | Status |
|---|---|---|---|---|---|
| TC-C1-1 | C1 | api | Super-admin PATCH customer look (name, colour) | 200; `/v1/me` membership `look` has them | ✅ |
| TC-C1-2 | CD2 | api | Admin PATCH `/v1/m/:mid/settings` | 404 (route removed) | ✅ |
| TC-C1-3 | C1 | unit | `accentFrom('#FFD700')` | darkened until contrast with white ≥ 4.5 | ✅ |
| TC-C1-4 | C1 | api | Upload logo PNG; upload a text file renamed .png | 200 + `/files/…` URL served; 422 `not_image` | ✅ |
| TC-C3-1 | C3 | api | Features `map:false` → admin GET map | 403 `feature_off`; dashboard still 200 | ✅ |
| TC-C3-2 | C3 | api | Features `poll:false` → volunteer mark voted | 403 `feature_off` | ✅ |
| TC-C5-1 | C5 | api | `valid_until` yesterday → volunteer GET voters | 403 `subscription_ended`; `/v1/me` shows `active:false` | ✅ |
| TC-C5-2 | C5 | api | `max_volunteers` = current count → approve another | 409 `limit_volunteers` | ✅ |
| TC-C7-1 | C7 | api | Copy from customer A to B | B look/candidate/features/messages = A; limits unchanged | ✅ |
| TC-C8-1 | C8 | api | Search users "Suresh" | finds 9000000003 with AC 66 volunteer membership | ✅ |
| TC-C8-2 | C8 | api | Block volunteer (reason) | refresh 401; access token refused (401 `user_blocked`); sign-in refused; unblock → sign-in OK | ✅ |
| TC-C8-3 | C8 | api | Block without reason; block self | 422; 422 `self` | ✅ |
| TC-C8-4 | C8 | api | Change role volunteer → admin; remove from customer | `/v1/me` shows admin; then membership removed | ✅ |
| TC-C9-1 | C9 | api | Volunteer changes a voter; admin trace by EPIC | newest event first, who = volunteer name, change `group: our`; no mobile number | ✅ |
| TC-C9-2 | C9 | api | Other party's admin traces the same EPIC | sees none of the first party's events | ✅ |
| TC-C9-3 | C9 | api | Super-admin trace | sees events from both parties with party names | ✅ |
| TC-CU-1 | App | ui | Super-admin sets colour + candidate + message; volunteer signs in | Home banner shows candidate + message; buttons in the party colour | ✅ |
| TC-CU-2 | App | ui | Admin web sidebar | no Branding; Vote trace present; Map hidden when `map` off | ✅ |
| TC-CU-3 | App | ui | Super-admin Users: block then unblock | status chip changes; reason required | ✅ |

**Run 2026-11-19:** backend vitest 80/80 (`test/7-customers.test.ts` 15 + `4-admin` TC-C1-2); Jest 74/74 (theme TC-C1-3, slip share text/photo). Admin branding routes and page removed.
**UI run 2026-11-19:** puppeteer `cms-ui.js` 8/8 (super-admin Customers/Customer settings/Users/Vote trace; volunteer Home banner + party-coloured buttons; admin menu without Branding, Vote trace by booth + S.No); `web-desktop.js` 17/17 incl. axe (0 serious/critical) after raising the accent contrast floor to 5.2:1. Backend 80/80, Jest 74/74, tsc + ESLint clean.
