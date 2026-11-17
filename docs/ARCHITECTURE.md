# Architecture

## 1. System context

```
┌─────────────────────────────┐        ┌───────────────────────────┐
│  ElVote Max client (this)   │        │  Firebase Auth            │
│  Expo: Android / iOS / Web  │──────▶ │  project: elvote-aeb0e    │
│                             │◀────── │  (email+password, ID JWT) │
│                             │        └───────────────────────────┘
│                             │  HTTPS + headers: token, x-constituency
│                             │──────▶ ┌───────────────────────────┐
│                             │        │  ElVote API  (backend/)   │
│                             │◀────── │  elvote.krishnakutumb.com │
│                             │        │  Express + Knex, pm2 :3001│
│                             │        │  verifies token with      │
│                             │        │  firebase-admin           │
└──────────┬──────────────────┘        │        ↓                  │
           │ iframe / WebView          │  PostgreSQL 16 (same VM)  │
           ▼                           └───────────────────────────┘
  Third-party dashboards:
  election-trend.vercel.app/trend, elvote-trends.champn.in/map,
  trends.electiontoday.co.in/trend
```

The ElVote API is `backend/` in this repo: Express + Knex + PostgreSQL 16 on a DigitalOcean droplet behind nginx and Cloudflare. See DEPLOYMENT.md for the topology and DATA_MODEL.md for the schema.

## 1b. Backend request pipeline

```
nginx → Express app.js
  cors (any origin, credentials) → express.json(100mb) → cookieParser → express-fileupload(100mb)
  /swagger-docs                         (swagger-ui, no auth)
  /api → RouteMap.setServerRespHeader   (X-Server-Start-Time)
       → RouteMap.authenticate          token header → firebase-admin verifyIdToken
                                        → users row by unique_id (UID)
                                        → 410/411/412/413 gate (except POST /users/mine)
                                        → res.locals[LOCAL_INFO_KEY] = { userId, email, ...userRow,
                                             constituency_number_id: x-constituency, filters: x-filters }
       → /users | /voters | /constituency | /private   (controllers/*.js)
            controller: reads res.locals + body, applies role scoping
              → businesslogic/*Manager.js (thin pass-through, transactions)
                → models/*Model.js (Knex query builder + knex.raw, dynamic table names)
  ErrorHandler.handleError → { status, message, errorName, extras }
```

Route wrappers (`routeWrappers.js`): `prtWrapper(fn)` lets the handler send the response itself, while `successResponsePrtWrapper(fn)` sends a standard success response after `fn` resolves. Both forward thrown errors to `ErrorHandler`.

Multi-tenancy: an **account** (party) is mapped to constituencies. The voter roll is per constituency (`voters_<C>`, shared across parties), and canvassing data is per constituency and account (`data_collection_<C>_<A>`, …). Volunteers are additionally restricted to their `polling_station_id` in each controller.

## 2. Boot sequence

```
index.js
 └─ registerRootComponent(App)
App.js
 └─ GestureHandlerRootView
    └─ Redux <Provider store={jars-flux store}>
       └─ SafeAreaProvider → Portal.Host
          └─ LanguageWrapper          ← no language chosen? render LanguageScreen and stop
             └─ BottomSheetModalProvider
                └─ NavigationStack    ← auth + onboarding gate
                   └─ InitStack       ← drawer; loads self user, constituency, polling stations
```

1. **Language.** `LanguageWrapper` reads `AsyncStorage['language2']`. If no language is set, it shows `LanguageScreen`. When one is set, it mutates `STRINGS`, `ROUTES`, `GENDERS`, `RELIGIONS`, `BOOTH_STRENGTH` and `VOTER_OPINION` in place.
2. **Auth.** `useAuthentication` subscribes to `onAuthStateChanged`. On login it calls `AppDataService.setCommonHeader('token', idToken)` and refreshes the token every 60 s.
3. **Gate.** `NavigationStack` chooses which navigator to render:

| Condition | Navigator rendered |
|---|---|
| No Firebase user | Login / Register / ForgotPassword |
| `errorStatus === 410` USER_NOT_EXIST | `InitialProfileScreen` (name, mobile, pass key) |
| `411` USER_REQUEST_PENDING | `PendingApprovalScreen` |
| `412` USER_REQUEST_REJECTED | `RejectedApprovalScreen` |
| `413` USER_PERMISSIONS_NULL | `PermissionsNullScreen` |
| otherwise | Main stack (`InitStack` drawer + pushed detail screens) |

   `errorStatus` comes from `ErrorPubSub`. The axios response interceptor calls `ErrorPubSub.runError(statusCode)` on every response: `null` on success, and `error.response.data.status` on failure. The server reports onboarding state by putting these codes in the **response body's `status` field**.

4. **Init data.** `InitStack` dispatches `getSelfUser`, which runs these steps in order:
   1. `GET users/mine`
   2. `GET constituency` → stores the list and auto-selects the **first** constituency, which sets the `x-constituency` header
   3. `GET constituency/partydata` → ballot number, leader name, voter-slip image
   4. stores `userDetails`

   `useGetPollingStations` then calls `GET constituency/polling_stations_minimal_list`. If the user or polling stations are missing, InitStack shows a "Setup Required" card with Refresh and Logout buttons.

5. **Drawer.** Items depend on `userDetails.role` (`admin` / `volunteer`) and on whether `user.uid === PRIVATE_USER_ID` (super-admin). Admins land on Dashboard; volunteers land on the Menu grid.

## 3. Roles

| Role | Source | Can do |
|---|---|---|
| **Super-admin** | Firebase UID hard-coded as `PRIVATE_USER_ID` | Create party account, admin user, constituency; upload voters XLSX; clear voter data |
| **Admin** | `userDetails.role === 'admin'` | Dashboard, AC overview, analytics, volunteers, approve volunteers, polling stations, map |
| **Volunteer** | `userDetails.role === 'volunteer'` | Menu grid of filtered voter lists, voter list, search, canvassing actions |

Registration flow: sign up with Firebase → `410` → submit profile with the party's **pass key** (`POST users/mine`) → `411` pending → admin approves in *Activate Volunteers* and assigns a polling station → full access.

## 4. Layers

```
screens/            Composition only (mostly <SingleComposite .../>)
components/         Widgets: lists, list items, charts, stat cards, filter bars, popups
storemanagement/    Slice (reducers) + Saga (async) per area
services/           Static methods → endpoint calls (one class per API prefix)
libs/dataservice    axios wrapper: base URL, common headers, interceptors
```

### 4.1 Networking (`libs/` + `services/AppDataService.js`)

- `DataService` wraps an axios instance with `withCredentials = true` and builds URLs as `${BASE_URL}/api/${relative}`.
- `AppDataService` is a singleton subclass that adds two interceptors:
  - **Request:** copies every entry in `RequestInterceptorPub.headers` (currently `x-constituency`) onto the request.
  - **Response:** on success, resets ErrorPubSub and logs server timing if `FEATURE_FLAG.SHOW_SERVER_TIME` is on. On error, publishes the status. If the status is `401`, it signs the user out, clears AsyncStorage and **resolves `undefined`**. Any other error is re-thrown.
- The `token` header is set as an axios *common* header by `useAuthentication`.

### 4.2 State (`storemanagement/`)

`@betacrew/jars-flux` provides a store with `reducerManager` (injectable slices, Immer-style mutating reducers) and `sagaManager`. Each area has:

- `XSlice.js`: `export const componentKey = 'X'`; `store.reducerManager.add({ key, addedReducers, initialReducerState })` → exports actions.
- `XSaga.js`: plain action creators (`{type:'AREA/VERB', payload}`), generator workers, and a `handleErrors` wrapper that catches and `console.log`s. `store.sagaManager.addSaga(componentKey, rootSaga)`.

| Slice key | Holds | Notes |
|---|---|---|
| `INITSCREEN` | `userDetails`, `constituency[]`, `selectedConstituency`, `ballotNo`, `leaderName`, `voterSlipImage` | Selecting a constituency sets the `x-constituency` header |
| `STAGINGSCREEN` | `errorStatus` | Drives the onboarding gate |
| `FILTERSORTSLICE` | `filterSort`, `castesList`, `religionsList`, `volunteersList`, `pollingStationsList` | Defines `INITIAL_FILTER_SORT`, including human-readable "callback" labels |
| `LANGUAGEKEY` | `language` | |
| `USERS_MANAGEMENT` | `volunteers_to_approve`, `volunteers_rejected` | |
| `VOTERS_APPROACHED` | (unused `voters_count`) | Saga holds all voter list, count and mutation calls |
| `HOMESCREEN`, `PRIVATE_SCREEN_SLICE`, `UPLOAD_VOTERS_SCREEN_SLICE` | empty | Saga-only areas |

`useGarbageCollector(key)` removes a slice and its saga on unmount. `InitStack` uses it for `INITSCREEN`.

Saga take-effects: list and count reads use `takeLatest` / `takeEvery`, and mutations use `takeLeading`, which ignores double taps.

### 4.3 Screen composition: `SingleComposite`

`components/singlecomposite/SingleComposite.js` takes boolean flags (`voterList`, `votersOpinionChart`, `acOverview`, `searchPollingStationBar`, …) plus `filtersObj`. It holds `filters` in local state, which `SearchPollingStationBar` can extend with `polling_station_ids`. It also adds a header refresh button that bumps `refreshKey`, and every widget refetches when `filters` or `refreshKey` change.

The ~37 `screens/FilteredVoterListScreen/*` files are one-liners that pass a preset filter, for example `{ voter_genders: ['M'] }`.

### 4.4 Drill-down navigation

Dashboard widgets navigate to `ROUTES.POLLING_STATIONS_LIST` (`PollingStationIntermediateScreen`) with `{ route: INTERMEDIATE_ROUTES.X, filters }`. That screen shows a per-polling-station breakdown. Tapping a station pushes the matching list screen (`VOTERS_LIST_WITH_FILTERS`, `VOTERS_APPROACHED_LIST`, `VOLUNTEERS_INTERMEDIATE_LIST`, …) with `polling_station_ids` added.

### 4.5 Internationalisation

- `strings.js`: `L({en, hi, mr})` → `_STRINGS`. `setStringList(lang)` flattens to one language, and `STRINGS` is mutated in place.
- Route names are the translated screen titles (`ROUTES.X = STRINGS.X_SCREEN_TITLE`). This is convenient for headers, but route identity depends on the language.

### 4.6 Platform-specific code

| File pair | Native | Web |
|---|---|---|
| `firebaseConfig.native.js` / `.web.js` | `initializeAuth` + AsyncStorage persistence | `getAuth` + `browserLocalPersistence` |
| `screens/MapScreen.native.js` / `.web.js` | WebView → `trends.electiontoday.co.in/trend` | iframe → `elvote-trends.champn.in/map` |
| `screens/TrendAnalyticsScreen.native.js` / `.web.js` | WebView | iframe → `election-trend.vercel.app/trend` |
| `UploadVotersScreen` | `{uri,name,type}` FormData part | real `File` object |
| `components/ui/FlashListCompat.js` | FlashList | fallback for web |

Printing (voter slips) uses `expo-print`.

## 5. Cross-cutting concerns

| Concern | Current state |
|---|---|
| Error UX | Saga errors are only `console.log`ged; most screens show no error state |
| Loading | Per-component `useState` + `LoadingState` / `ActivityIndicator` |
| Caching / offline | None. Every screen refetches. Logout runs `AsyncStorage.clear()` |
| Pagination | `page_num` on list endpoints; infinite scroll in list components |
| Logging | `console.log` throughout, including filters and API errors |
| Feature flags | `featureFlags.js`; the IIFE forces every flag to `true` |
| Testing | None |
