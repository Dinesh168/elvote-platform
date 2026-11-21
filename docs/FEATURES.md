> **v2 backend (2026-11-19):** `backend-v2/` (TypeScript, Fastify, PostgreSQL 16; central + per-state databases) with sample data; see `backend-v2/README.md`. The v2 app now talks to it by default (`EXPO_PUBLIC_API_MODE=mock` for the in-memory data). Added screens: sign-in (OTP), join, waiting, role switch; admin (Dashboard with charts, Map, Team approvals, Tasks/drives, More → Polling day, Zones, Branding, join code); super-admin (All states, Parties, party AC with max zones and clear data, voter-roll upload, super-admins).
>
> **v2 app (in progress, branch `feature/app-v2-frontend`):** the new iOS-style app lives in `src/` (spec `docs/specs/app-v2-frontend.md`). Built so far, on mock data: Home (next voter + task picker, booth sheet, numbers, More numbers detail pages), Voters (search, house/serial views, chips, filters from Home, inline voter card with group buttons, auto-next and Undo, lives here, needs help, mobile, same address, slip share, call), Polling day (serial keypad, ✓ Voted, Undo, already-voted warning, not-voted counts, needs-help link) and a basic Me (language). V4 added 2026-11-19: Tasks list (status, progress, days left), Surnames, Voter slip (PDF share / print / text), Help-to-vote list with Voted + Undo, full Me (sync, booth GPS location, switch role, log out). Still to do: Firebase sign-in in the app, store builds. The rest of this file describes the **old** app at the repo root.

# Feature inventory

Status legend: **Live** = wired to the API · **Static** = UI with hard-coded or empty data · **Placeholder** = image or "coming soon" · **Dead** = file exists but can't be reached.

## Drawer (`InitStack.js`)

| Drawer item (route const) | Screen file | Who sees it | Status | What it does |
|---|---|---|---|---|
| `ADD_POLITICAL_PARTY` | `CreateAccountScreen` | Super-admin | Live | `private/create_account` |
| `CREATE_ADMIN_USER` | `CreateAdminUserScreen` | Super-admin | Live | `private/create_admin_user` |
| `CREATE_CONSTITUENCY` | `CreateConstituencyScreen` | Super-admin | Live | `private/create_constituency` |
| `UPLOAD_VOTERS` | `UploadVotersScreen` | Super-admin | Live | XLSX roll import with progress |
| `CLEAR_VOTER_DATA` | `DownloadVotersApproachedDataScreen` | Super-admin | Live | `private/clear_voters_data` (despite the file name, it does **not** download) |
| `DASHBOARD` | `HomeScreen` | Admin | Live | Today, total approached, day-wise chart, opinion, volunteers, mobile, migrated |
| `AC_OVERVIEW_SCREEN` | `ACOverviewScreen` → `ACOverview` | Admin | Live | Constituency KPIs: total / approached / opinion split / mobile by opinion / migrated / volunteers / addresses |
| `MENU_LIST_SCREEN` | `MenuScreen` | Volunteer | Live | Grid of preset voter lists (see below) |
| `VOTERS_LIST` | `VoterListWithPS` | All | Live | Pick a polling station → voter list |
| `TREND_ANALYTICS` | `TrendAnalyticsScreen.{native,web}` | Admin | External | Embeds `election-trend.vercel.app` |
| `VOLUNTEERS_LIST` | `VolunteersListScreen` | Admin | Live | Search and filter volunteers |
| `POLLING_STATIONS` | `PollingStationListScreen` | Admin | Live | Booth list |
| `VOTERS_STATISTICS` | `VotersStatisticsScreen` | Admin | Live | Count + age / religion / caste / gender charts |
| `VOTERS_SEARCH_LIST` | `VotersSearchScreen` | All | Live | Name / EPIC search |
| `MAP` | `MapScreen.{native,web}` | Admin | External | Embeds a third-party map (a different URL on native and web) |
| `RECENTLY_ADDED_VOTERS_SCREEN` | `IssuesScreen` | Admin | Placeholder | Coming soon |
| `RECENTLY_DELETED_VOTERS_SCREEN` | `IssuesScreen` | Admin | Placeholder | Coming soon |
| `FORUM` | `ForumScreen` | All | Placeholder | Static image `assets/forum.png` |
| `PARTY_UPDATES` | `PartyUpdatesScreen` | All | Placeholder | Static image |
| `PRACHAR_KIT` | `PracharKitScreen` | All | Placeholder | Coming soon |
| `MESSAGES` | `MessagesScreen` | All | Placeholder | Static image |
| `ASSIGN_TASK` | `AssignTaskScreen` | All | Placeholder | Static image |
| `ACTIVATE_VOLUNTEERS` | `ActivateVolunteersScreen` | Admin | Live | Approve (assign polling station) or reject pending volunteers |
| `POLLING_DAY` | `PollingDayScreen` | All | Static | Stat tiles, all null/0; never fetches |
| `CHANGE_LANGUAGE` | `LanguageScreen` | All | Live | en / hi / mr |
| `LOGOUT` | `LogoutScreen` | All | Live | |

## Volunteer menu (`MenuScreen`) → preset filtered lists

Each one is a `screens/FilteredVoterListScreen/*` wrapper around `SingleComposite voterList` with a fixed filter:

- **General:** all voters, search, serial-number sorted, house-number (address groups → `VoterHouseIntermediateScreen`), surname (**placeholder** image)
- **Canvassing:** approached / unapproached, mobile available / not available, migrated / not migrated, recently added / deleted (placeholder)
- **Opinion:** positive / negative / undecided / uncaptured
- **Age:** 18–22 (new voters), 18–35, 35–60, 60+
- **Gender:** female / male / third gender
- **Approached in the last:** 7 / 15 / 30 / 180 days
- **Religion:** Christian / Muslim / Sikh / Hindu / other
- **Category:** General / OBC / SC / ST / other
- **From AC Overview only:** mobile available + our / opposition / swing voters
- **Registered but nothing navigates to them:** `SAME_ADDRESSS_VOTERS` (the voter row's "same address" action filters in place instead)

## Stack-pushed detail screens (`NavigationStack.js`)

| Route | Screen | Purpose |
|---|---|---|
| `POLLING_STATIONS_LIST` | `PollingStationIntermediateScreen` | Per-booth breakdown for any dashboard metric (`INTERMEDIATE_ROUTES`) |
| `VOTER_HOUSE_LIST` | `VoterHouseIntermediateScreen` | Addresses with voter counts |
| `VOTERS_COUNT_LIST` | `VotersIntermediateScreen` | Voter list from a drill-down |
| `VOTERS_VOTED_LIST` | `VotersVotedScreen` | Live-voting list for a booth |
| `VOTERS_LIST_WITH_FILTERS` | `VoterListScreen` | Voter list with filter bar |
| `VOTERS_APPROACHED_LIST` | `VotersApproachedListScreen` | Approached voters |
| `VOLUNTEERS_INTERMEDIATE_LIST` | `VolunteersIntermediateScreen` | Volunteers of a booth |
| `POLLING_STATION_ALL_DATA` | `PollingStationAllDataScreen` | Full dashboard for one booth |
| `VOLUNTEER_ANALYSIS` | `VolunteerAnalysisScreen` | One volunteer's performance |

## Voter row actions (`components/voterlistitem/VoterListItem.js`)

Mark approached (checkbox) · set opinion (`OpinionPopup`) · capture mobile (`MobileNumberPopup`) · migration status (`MigratoryStatusPopup`) · call / WhatsApp · filter same-address voters · **print voter slip** (`VoterListSlipPrint` → `PrintVoterSlip`, using party ballot no., leader name and image).

Live-voting variant (`LiveVotingVoterListItem`): mark voted.

## Dead code (imported or present but unreachable)

| File | Notes |
|---|---|
| `LiveVotingScreen` | Imported in InitStack, **not registered**. The live-voting list is reachable only through drill-downs (`VotersVotedTotal`, polling-station screen) |
| `VoterOpinionScreen`, `ResponseAnalysisScreen`, `CasteEquationsScreen`, `ScheduleMeetingScreen`, `VoterSlipPrintingScreen` | Imported, not registered |
| `MapScreenInApp.js` | Native Google Maps with ~1,300 lines of hard-coded booth coordinates; not imported |
| `firebaseConfig.js` | Shadowed by `.native.js` / `.web.js` |
| `HomeSaga` `getUsers`, empty `HomeSlice` / `PrivateSlice` / `UploadVotersSlice` / `LanguageSaga` | Scaffolding |
| `ROUTES` entries without a screen | `VOTER_SLIP_PRINTING`, `LIVE_VOTING`, `RESPONSE_ANALYSIS`, `CASTE_EQUATIONS`, `SCHEDULE_MEETING`, `ISSUES`, `HOUSE_NUMBER_SORTED_VOTERS`, … |

To re-enable a dead screen, add a `<Drawer.Screen>` in `InitStack.js` with the right role guard, then update this table.

## Web desktop layout and account deletion (2026-11-19)

- **Web desktop (spec `docs/specs/web-desktop.md`):** on the website at ≥ 1024 px, every role gets a left sidebar (icons-only 768–1023 px), page header with breadcrumbs, content up to 1200 px, desktop type scale, sortable tables (admin booth table, Team), 2-column grids (dashboard charts, volunteer Home, super-admin overview), centred dialogs (Esc closes), hover and keyboard focus states, browser-tab titles, and a split-screen sign-in. Phone apps (Android/iOS) and phone-size web are unchanged. Code: `src/design/layout.ts`, `src/design/components/Desktop.tsx`, `src/features/shell/AppShell.tsx`, `AuthScreen.tsx`.
- **Account deletion (spec `docs/specs/account-deletion.md`):** volunteer Me and admin More → Delete account (`/delete-account`): type DELETE + SMS code; signed out everywhere at once; erased after 7 days unless the user signs in again. The person is removed; their voter work stays as "Deleted user". The only admin of an AC is blocked. API: `POST /v1/me/delete/code`, `POST /v1/me/delete`; worker `eraseDueAccounts` every 10 min; migration `core/002_account_deletion.sql`.

## Customer settings (CMS), users and vote trace (2026-11-19)

Spec `docs/specs/customer-cms.md`. The super-admin (ElVote, the seller) controls each **customer** (one party in one assembly):

- **Super-admin website:** *Customers* list → *Customer settings* (`/platform/customer/[id]`) with Look (app name, logo upload, party colour), Candidate (name, photo, ballot no., slogan), Features (Map, Polling day, Zones, Tasks, Voter slip, Surnames, Help list, Booth GPS; Basic/Pro/All presets), Language (default + allowed), Plan & limits (status, valid until, max zones/volunteers/admins), Messages (candidate message on Home, WhatsApp slip text), live phone preview, copy from another customer. *Users* (`/platform/users`): search, block/unblock (reason), sign out everywhere, change role, change booths, remove from a team. *Vote trace* (`/platform/trace`): who changed a voter, all parties.
- **Admin:** the Branding page is removed. *Vote trace* added (own party, own AC). Features that are off are hidden.
- **Team app:** party colour across the app (auto-darkened for readability), logo and app name in the web sidebar, candidate banner + message on Home, branded voter slip, hidden features, "Subscription ended" page, blocked users signed out with a message.
- **Server:** `core/003_customer_cms.sql`; `/v1/admin/customers*`, `/v1/admin/users*`, `/v1/admin/memberships/:id`, `/v1/admin/trace`, `/v1/m/:mid/trace`, public `/files/<random>.png|jpg|webp`; checks `feature_off`, `subscription_ended`, `user_blocked`, `limit_volunteers`, `limit_admins`. `PATCH/GET /v1/m/:mid/settings` removed.
- **Not tracked:** no screen-view, activity or "last active" tracking. `audit_log` keeps management actions only and has no screen.

## Sync modes and offline safety (2026-11-19)

Spec `docs/specs/sync-modes.md`. The super-admin sets each customer's sync mode (Customer settings → Sync): **Live** (default; send at once, keep and resend when back online, retry every 30 s), **Offline** (keep on the phone until Sync now), **Scheduled** (every 1–120 min, plus on reconnect when due).
- On the phone: the volunteer's booths, voters, tasks, branding and profile are kept in SQLite (`expo-sqlite/kv-store`; IndexedDB on the web), so the app opens and works without internet. Every change is queued first with its phone time; batches of 100 (`POST /v1/m/:mid/changes/batch`); refused changes go to *Needs attention* in Me (retry/remove); logout and account deletion are blocked while changes are unsent.
- Server: per-field conflict rule (later phone time wins; Voted never undone by an older undo); `voter_contacts.field_at`; `party_constituencies.sync_mode/sync_minutes`; `memberships.last_sync_at/unsent` shown on the admin Team list.
- Status chip: Synced · Saving… · Offline · N waiting · Next sync in N min · Offline mode · N saved · N need attention.

## Polling day: location check and booth attendance (2026-11-20)

Spec `docs/specs/polling-day.md`, tests `docs/test-cases/polling-day.md`.

| Who | Where | What |
|---|---|---|
| Super-admin | Polling days (`/platform/elections`) | Poll date per state, all or some assemblies, voting hours (India time); edit, cancel, restore |
| Super-admin | Booth locations (`/platform/booths`) | Lat/long per booth, missing-only filter, edit/remove, CSV upload with check before saving |
| Super-admin | Customer settings → Polling day tab | At-booth distance per customer (50–2,000 m, default 300); link to that customer's attendance page |
| Volunteer | Whole app, inside the window | Location required (only the location screen until allowed); background check on phones; away banner + phone notification; Me shows the status |
| Admin | Booth attendance (`/admin/polling`) | Tiles, map with booth circles, filterable list (tap to call), alerts with unread badge, set missing booth locations; push notifications on phones |

API: `/v1/admin/elections`, `/v1/admin/booths`, `/v1/admin/booths/locations`, `/v1/admin/customers/:id/polling`, `/v1/m/:mid/presence`, `/v1/m/:mid/polling`, `/v1/m/:mid/polling/alerts(/seen)`, `/v1/me/push-token`; `/v1/me` memberships gain `pollingDay` and `boothRadiusM`.
DB: core `005_polling_day.sql` (`booth_radius_m`, `field_presence`, `presence_events`, `presence_seen`, `push_tokens`), state `003_polling_day.sql` (`elections.ac_nos/opens_at/closes_at`, status `cancelled`, booth location source `edited`).
Needs a phone build to verify background location and push (Google Play background-location declaration before release).

## Bilingual voter data, Hindi screens, draft → final roll updates (2026-11-20)

Spec `docs/specs/bilingual-roll.md`, tests `docs/test-cases/bilingual-roll.md`.

| Who | Where | What |
|---|---|---|
| Super-admin | Upload voter roll | Regional columns (`name_local`, `relative_name_local`, `section_local`, `booth_name_local`, `booth_address(_local)`, `locality_local`); roll type Draft / Final / Supplement and date; data language per assembly (Punjabi / Hindi); **preview** (unchanged, changed, moved booth, new, back, not in roll, held) → Apply or Cancel; held EPICs from another assembly → Move / Reject |
| Everyone | App language | English, हिन्दी, ਪੰਜਾਬੀ (customer chooses which); voter and booth names follow the app language when it is the assembly's data language, otherwise English; search finds either script |
| Volunteer | Voters | "New in roll" tag; moved voters appear in their new booth; voters not in the roll are hidden; offline changes saved before an update are kept |
| Admin | Dashboard | "Roll: Final · date · N new" and "Not in the latest roll (N)" list (`/admin/roll`); trace shows the booth of each change |

API: upload fields `rollKind`, `publishedOn`, `acNameLocal`; job `summary` + `lists`; `POST /v1/admin/imports/:id/held`, `/cancel`; `PATCH /v1/admin/acs/:state/:ac` (`regionalLang`, `nameLocal`); `GET /v1/m/:mid/roll`; voters gain `nameLocal`, `relativeLocal`, `villageLocal`, `isNew`; booths `nameLocal`, `address`, `addressLocal`, `villageLocal`; `/v1/me` memberships `dataLang`.
DB: state `004_bilingual_roll.sql` (regional columns, voter status `not_in_roll` / `moved_out`, `is_new`, `prev_part_no`, `moved_at`, `hidden_at`, `import_held`, roll kind/date, `voters (epic)` index).


## Accounts, registration and access (2026-11-20, in progress)

Spec `docs/specs/accounts-access.md`, tests `docs/test-cases/accounts-access.md`. Replaces SMS sign-in on servers (no SMS for now).

| Who | Where | What |
|---|---|---|
| Everyone | Sign in (`/login`) | **Continue with Google** or **email + password** (create account with email verification, forgot password by email), via Firebase project `elvote-max`. Local development keeps the test code 123456 (refused in production) |
| Everyone | Your details (`/profile`) | Name, **mobile (required, not verified)**, app language — once, after the first sign-in |
| New person | Choose role (`/register`) | Volunteer (team code → booths → waiting) or Admin (request: party, state, whole state or assemblies, position → waiting) |
| Waiting | `/waiting` | Checks every 30 s and opens the app once approved; withdraw an admin request; reason shown when not approved; "Allow notifications" |
| Super-admin | Requests (`/platform/requests`) | Approve (party; whole state or assemblies; create missing customer settings) or reject with a reason |
| Super-admin | Customer page | Volunteer requests of that customer: approve with the requested booths, or reject |
| Super-admin | Users | Email shown and searchable; fix a mobile; **Admin access**: add whole state / assemblies, remove a whole-state scope |
| Super-admin | Super-admins, customer → admins | Add people **by email** (Google-verified) on servers |
| Admin with ≥ 2 assemblies | All my assemblies (`/admin/overview`) | Per assembly: volunteers, waiting requests, % voters met; tap to open |
| Everyone | Notifications | New volunteer request → that assembly's admins; new admin request → super-admins; approved / not approved / access removed → the person. Phone push (Expo) and **browser push** (Web Push, `public/sw.js`); tapping opens the right page |
| Everyone | Delete account | Confirm by signing in again (Google or password) instead of an SMS code |

API: `POST /v1/auth/firebase` (Google / verified email only), `PATCH /v1/me/profile`, `/v1/me` adds `user.email`, `user.profileDone`, `accessRequest`; `POST/DELETE /v1/access-requests`; `/v1/catalog/states|acs|parties`; `GET /v1/me/overview`; `GET /v1/push/vapid-key`; super-admin `/v1/admin/access-requests(/:id/approve|reject)`, `/v1/admin/users/:id/admin-access(/state/:partyId/:state)`, `/v1/admin/customers/:id/requests(/:mid/approve|reject)`, `PATCH /v1/admin/users/:id/mobile`; `/v1/admin/super-admins` and `/v1/admin/admins` take `email`.
DB: core `006_accounts_access.sql` (`users.email`, nullable `users.mobile`, `access_requests`, `admin_scopes`, `memberships.source`). Operator: `npm run admin:super -- --email …`.

## First launch, branding and team banner (2026-11-21)

Spec `docs/specs/onboarding-branding.md`, tests `docs/test-cases/onboarding-branding.md`, mockups https://claude.ai/artifact/9ejYamEuznPrwstB8Jy43v.

| Who | Where | What |
|---|---|---|
| New device | Splash → **Welcome** (`/welcome`) → **Choose language** (`/language`) → Sign in | Shown once per device (`prefs.onboarded`); English with small Hindi until a language is chosen; the choice is saved as the device language |
| Everyone | Sign-in / registration screens | ElVote mark + wordmark at the top (phones); no language button |
| Everyone | After sign-in | No language button on page tops or the website sidebar; **Language** row in Me (volunteer), More (admin), Overview (super-admin) |
| Volunteer / admin | Me / More | Branding card (team logo or letter in the party colour, app name, party · assembly, the person); ElVote wordmark + version at the bottom |
| Admin | More → **Home banner** (`/admin/banner`) | Choose (crop 2:1) or take a photo, save, remove; PNG/JPG/WebP ≤ 2 MB |
| Super-admin | Customer settings → Look | Home banner upload |
| Volunteer / admin | Home / Dashboard | The banner full width at the top (admin: with Edit) |

API: `POST/DELETE /v1/m/:mid/banner`; `POST /v1/admin/customers/:id/upload?kind=banner`; `look.bannerUrl`, customer `bannerUrl`. DB: core `007_banner.sql` (`party_constituencies.banner_url`). App: `expo-image-picker`.
