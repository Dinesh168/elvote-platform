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
