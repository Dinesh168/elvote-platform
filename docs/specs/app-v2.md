# ElVote v2: product spec (REQ-IDs) · status: **confirmed**, final design pages ready for review (2026-11-18)

**Sources:** `docs/requirements/2026-11-16-review-call.md` (review call notes + requirement sheet) and the owner's answers on 2026-11-17.

**Owner's instruction:** take *only the requirements* from the sheet and call. Flow, layout and UX are ours to decide, following industry best practice (`docs/DESIGN_SYSTEM.md`, skills `elvote-ui` / `elvote-production`).

**Design prototype (for review):** https://claude.ai/artifact/SKB3uArAMV7gMthwuCSipR

Platforms: Android, iOS, Web (one Expo codebase). **Both the volunteer app and the admin app are mobile apps** (owner decision, 2026-11-18). The web build shows the same phone layouts, centred, with no separate desktop design.

---

## 1. Decisions (all approved: "go with your recommendations")

| # | Topic | Decision |
|---|---|---|
| D1 | "Target voters" | = undecided / swing voters (DB opinion code `U`) |
| D2 | Groups | Our / Target / Opposition (+ Not marked). Changeable any time, with Undo. Custom groups are out of scope |
| D3 | Languages | **English + one regional language** per deployment (e.g. Punjabi, Hindi), set per party account |
| D4 | House group | A house's group = majority of its *marked* voters. Tie → Target. No marked voters → not counted |
| D5 | Age bands | First-time **18–20** (also counted in Young) · Young **18–34** · Mid **35–59** · Senior **60+** (fixes the sheet's gap at 35 and 60) |
| D6 | Multiple booths | A volunteer may choose **several booths** at join. The admin confirms or edits them on approval |
| D7 | Task progress | Completed = voters in the drive's segment **contacted between the drive's start and end dates**; shown as targeted vs completed and % |
| D8 | Branding | App name, candidate photo, ballot no., brand colour and regional language are **per party account** (in-app). The store app name stays "ElVote" |
| D9 | Search | **One search box** matching **name, EPIC or age**. Inside a booth on polling day. Tapping a result opens that voter |
| D10 | Name + mobile on screen | **Dropped by owner (2026-11-18):** no persistent strip; name on Home, name + mobile + sync on Me |
| D11 | Drive list | Women · First-time · Young · Target · Our · Senior citizen · Migrated voter outreach · **Other** (custom name) |
| D12 | Task status | Not started · Ongoing · Completed, with start → end dates and "N days left" |
| D13 | Booth strength | **Shown now** (from roll upload); editing comes later |
| D14 | Party Updates / Forum / Prachar Kit / Messages | **Removed everywhere** |
| D15 | Constituency (AC) switcher | **Admin only.** Volunteers see their booth(s) |
| D16 | Voter slip | Generated **image** shared through the phone's share sheet (WhatsApp first; direct to the voter's number when known). Replaces Print |
| D17 | Booth map coordinates | DB has none → admin uploads lat/long (CSV), **or** a volunteer taps "Set booth location" once at the booth (GPS) |
| D18 | Navigation | Volunteer: 4 bottom tabs (Home · Voters · Poll day · Me). **Admin: mobile only**, 5 bottom tabs (Dashboard · Map · Team · Tasks · More); Polling day, Zones, Booth locations, Branding, Language and Logout live under More. AC switcher in the admin header |
| D19 | Order of work | Backend security fixes → UI foundation → volunteer → polling day → admin |

---

## 2. Volunteer requirements

### General
| ID | Requirement | Acceptance criteria |
|---|---|---|
| V-GEN-1 | Remove Forum, Party Updates, Prachar Kit, Messages | None of them appear anywhere in the app |
| V-GEN-2 | "Assign Task" is called **Task / Tasks** | Label reads "Tasks" (regional equivalent) |
| V-GEN-3 | **Refresh** | Home and Me have a Refresh action; pull-to-refresh on lists; shows "Synced · time" |
| V-GEN-6 | Consistent Back | Every screen except Home / admin Dashboard has a top-left "‹ Back" (shared TopBar); minimal UI without decorative icon tiles | — |
| V-GEN-5 | No "how to use the app" audio/help entry (removed by owner 2026-11-18) | — |
| V-GEN-4 | ~~Name + mobile always visible~~ **Removed by owner (2026-11-18)** | No identity strip. The volunteer's name shows in the Home greeting and on Me (with mobile); sync / offline status shows on Me |

### Login and onboarding
| ID | Requirement | Acceptance criteria |
|---|---|---|
| V-AUTH-1 | **OTP login** by mobile | Enter 10-digit number → 6-digit SMS code → logged in. No password |
| V-AUTH-2 | First login: **pass key**, **name, EPIC, booth(s)** from the booth list | Pass key validated live (shows party + AC). Booth list is searchable and multi-select (D6) |
| V-AUTH-3 | Wait for admin approval → **Refresh** | Status timeline; Refresh checks approval; approved → Home; rejected → reason + contact admin |

### Home dashboard (every tile has a counter or count + %)
| ID | Section | Items (tap → filtered voter list) |
|---|---|---|
| V-DASH-0 | Continue / resume | Home's main card = **"Next voter to meet"** (S.No badge, name, relative · age · house) + **Start meeting** button that opens the voter list with that voter's card open. **Which task:** (1) the task the volunteer picked in the card's task dropdown; else (2) the task they last worked on; else (3) the task with the nearest due date; if no tasks are assigned, "All voters of booth". **Which voter:** within that task and the selected booth, the first not-met voter in serial-no. order (skipping voters marked "Moved"). The card always shows the task name and why it was picked. When a task is complete, it moves to the next task by rule (2)/(3) |
| V-DASH-1 | Voter list | Search · Serial-no wise · House-no wise · Surname list · **Contacted** · **Not contacted** |
| V-DASH-2 | Group wise | Our · Opposition · Target (count + %) |
| V-DASH-3 | Mobile no | With mobile · Without mobile · Our / Opposition / Target with mobile |
| V-DASH-4 | House | Total houses · Our / Opposition / Target houses (%) · Our / Opposition / Target houses with mobile |
| V-DASH-5 | Age wise | First-time · Young · Mid · Senior (D5) |
| V-DASH-6 | Gender wise | Male · Female (· Third gender) |

### Voter list
| ID | Requirement | Acceptance criteria |
|---|---|---|
| V-LIST-0 | **One booth at a time** | Voters page header = large booth dropdown (Booth no. · name · "X of Y met"); opens a sheet with the volunteer's booths and their progress; switching reloads list, counts and the next voter for that booth. **Home shows only the selected booth's summary** (same booth switcher in the Home header: contacted, groups, contacted/not contacted, next voter); Booth numbers, Voters and Polling day follow the same selection |
| V-LIST-1 | Search (D9) | Matches **house no.**, name, EPIC or age; results within the selected booth |
| V-LIST-2 | Serial-no wise | Sorted by S.No |
| V-LIST-3 | House-no wise + search | Grouped by house, with house search |
| V-LIST-4 | **Surname list** | Surname + count; search; multi-word input uses the **last word**; tap → those voters |
| V-LIST-5 | Contacted / Not contacted filters | Quick chips |

### Voter card (one tap opens the response panel)
| ID | Requirement | Acceptance criteria |
|---|---|---|
| V-CARD-0 | Voter card content | **S.No highlighted** (solid badge, first thing seen), then name, relative's name, age · gender, address |
| V-CARD-1 | Mark group (flexible), **minimal steps** | Voter list rows (S.No badge, name, relative · age, address, status pill). **Tap a voter → its card opens in place** (accordion, one at a time; no separate page). The open card holds: three readable group buttons in one row (bold word, group-colour border + tint; selected fills solid with ✓), Lives here, Needs help, Mobile, Same address, Send slip, Call. **Tapping a group = saved + card closes + next not-met voter opens automatically** (one tap per voter); Undo restores. Marked cards get a thin 2 px border in the group colour and a group pill; tap again to change |
| V-CARD-2 | Migrant status | Default **Resident**; toggle to Migrated |
| V-CARD-3 | Add mobile | Numeric pad; 10-digit validation |
| V-CARD-4 | **Same-address voters** | Filters the list to that address; **Back clears the filter** |
| V-CARD-5 | **Send voter slip** (D16) | Slip shows S.No, name, relative name, age, gender, address, EPIC, booth (default = volunteer's booth), party branding; shared as an image |
| V-CARD-6 | Poll-day assistance Y/N | Toggle; voter appears in the assistance list |

### Polling day
| ID | Requirement | Acceptance criteria |
|---|---|---|
| V-POLL-1 | **Type S.No → mark voted, one by one (fast for a queue)** | POS-style keypad with the **✓ Voted key on the keypad** (type → check name → ✓); voter name, relative, age, house shown before confirming; number auto-clears for the next voter; "Last marked" with one-tap Undo; "Already voted at hh:mm" blocks double-marking. **No batch mode** (owner, 2026-11-18) |
| V-POLL-2 | Poll-day assistance list | Counter; grouped **house → voter names**; mobile + Call |
| V-POLL-3 | Summary + entry on **one page** | Top strip: poll % ring, voted of total, Not voted · Our / Target / Opposition not voted · Needs help (all tappable). Keypad entry (V-POLL-1) directly below on the same screen; counters update live as voters are marked |
| V-POLL-4 | Auto update | Marking voted moves the voter out of every not-voted list immediately (offline too) |
| V-POLL-5 | Search within booth | Name / EPIC / age → open the voter |
| V-POLL-6 | Existing tiles kept | Poll % ring, Search by EPIC / details. **Recently added and Recently deleted are removed** (owner, 2026-11-18) |

### Tasks
| ID | Requirement | Acceptance criteria |
|---|---|---|
| V-TASK-1 | Drive list (D11) assigned by the admin | Each shows icon, name, **targeted vs completed**, %, status (D12), dates; filter tabs All / Ongoing / Completed; tap → voters to contact |

---

## 3. Admin requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| A-DASH-1 | Counts | Visited today · Total voters · Contacted % · Not contacted % · Our · Opposition · Target · Total houses · Houses visited · Our / Opposition / Target houses · Migrated |
| A-DASH-2 | Mobile numbers | Our / Opposition / Target voters with mobile · Houses with mobile · Our / Opposition / Target houses with mobile |
| A-DASH-3 | Polling stations | Total · Strong · Moderate · Weak · With worker · Without worker |
| A-DASH-4 | People | First-time · Senior · Mid · Male · Female · **Top performing workers (top 10)** · Poll-day assistance count |
| A-DASH-5 | Chart switcher | Groups · Age · Booth strength · Houses by group · **Zonal performance** (contacted ÷ total) |
| A-DASH-6 | Scope | AC switcher (D15), Zone and Booth filters; every number respects the filter |
| A-ZONE-1 | Zones Z1–Z10 (default 10) | Each zone lists its booths; admin can reassign booths to zones |
| A-ZONE-2 | Per-zone row | Booths · Voters · Contacted · Houses · Houses visited · Our / Opposition / Target · % completion |
| A-ZONE-3 | Drill-down | Clicking a zone = same dashboard filtered to that zone; a booth table ("mandal detail": booth, worker yes/no, houses visited, contacted, mobiles) |
| A-MAP-1 | Map | Booth markers (colour = strength or % contacted); click → that booth's full dashboard; trend analytics merged in (D17) |
| A-TASK-1 | Assign task / drive | Fixed drive name (D11) or Other; start and end date; target segment; scope (all / zones / booths); assign volunteers |
| A-TASK-2 | Performance | Per drive: targeted vs completed; zone / booth list with % completion |
| A-TEAM-1 | Volunteers list | Search, booth, activity (contacted today and total), call |
| A-TEAM-2 | **Activate volunteers** | Pending requests with name, mobile, EPIC, chosen booths → confirm or edit booths → Approve / Reject (with reason) |
| A-POLL-1 | Polling day | Poll % overall + per zone; booth list with poll %, our-not-voted |
| A-LANG-1 | Change language | English ⇄ regional |
| A-SET-1 | Branding (D8) | App name, candidate photo, ballot no., brand colour, regional language |

## 4. Overall

| ID | Requirement | Acceptance criteria |
|---|---|---|
| O-1 | Offline | Reads from cache; writes queued and synced; sync state in the identity strip |
| O-2 | OTP login | = V-AUTH-1 |
| O-3 | iOS build | EAS iOS build + TestFlight |
| O-4 | English + regional | D3 |
| O-5 | App name + candidate image | D8 / A-SET-1 |
| O-6 | Booth strength later | D13 |

## 5. Data / API impact (detailed in the build spec of each phase)

- **Auth:** Firebase Phone Auth; `users.email` becomes nullable; `users.epic`; new `user_booths` (multi-booth).
- **Voters:** canvassing record gains `poll_day_assistance`; migrant default Resident; age bands per D5.
- **New tables:** `drives` (name, segment, start, end, scope), `drive_assignments`; `zones` + `polling_station_zone_mapping` (they already exist) put into use; booth `lat` / `lng`; account branding (`accounts.other_data`).
- **Endpoints:** aggregated dashboard (one call per screen, with filters), surname list, search (name / EPIC / age), poll-day assistance list, recently added / deleted, drives CRUD + progress, zone stats, map data, volunteer approval with booths.
- All new SQL uses bound parameters and tenant scoping (`elvote-production` skill).

## 6. Screen map (prototype boards)

| Board | Covers |
|---|---|
| 1.1 Language · 1.2 OTP login · 1.3 Join · 1.4 Waiting | V-AUTH-*, O-4 |
| 2.1 Home | V-GEN-1/3, V-DASH-0…6, V-TASK-1 entry. Home shows the daily essentials (next voter, search, voters met, Our/Target/Opposition, current task). Mobile / Houses / Age / Gender are 4 rows on Home, each opening a plain list one tap away (owner 2026-11-18: simple first, one extra step OK) |
| ~~2.2 Booth numbers~~ | Merged into Home (owner 2026-11-18) |
| 2.3 Voters (tap → card opens in place, mark there) | V-LIST-1/2/3/5, V-CARD-0…6 |
| 2.4 Surname list | V-LIST-4 |
| 2.5 Voter slip | V-CARD-5, D16 |
| 2.6 Tasks (tap → voter list, next voter open) | V-TASK-1, D11, D12 |
| 2.7 Me | V-GEN-3/4, O-1, language, booth location (D17), logout |
| 3.1 Polling day (summary + mark voted one by one, one page) · 3.2 Assistance list | V-POLL-1…6 |
| 4.1 Admin dashboard (+ zone chips, zone list → booth "mandal detail", top 10) | A-DASH-1…6, A-ZONE-1…3 |
| 4.2 Booth map | A-MAP-1, D17 |
| 4.3 Team & approvals | A-TEAM-1/2 |
| 4.4 Tasks & drives | A-TASK-1/2 |
| 4.5 Polling day (admin) | A-POLL-1 |
| 4.6 More: branding, zones, booth locations, language | A-SET-1, A-LANG-1, A-ZONE-1 |
| Components: IdStrip, TabBar, AdminTabBar | V-GEN-4, D18 |
