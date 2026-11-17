# Development guide

## Setup

**Requirements:** Node 20 LTS+, npm. For native work you also need Android Studio or Xcode, or Expo Go on a device.

```bash
npm install
npm run web        # fastest feedback loop
npm run android
npm run ios
```

- **Backend:** the app talks to production (`constant.js → BASE_URL`) by default. To use a local server, swap in the commented `BASE_URL`. Remember that this is a **source edit**, so don't commit it (see PRODUCTION_READINESS → environment config).
- **Test accounts:** you need a Firebase user on project `elvote-aeb0e` that the backend has approved. A new sign-up lands on Fill Profile (410), and you need a valid account **pass key** to proceed.
- **Super-admin UI** appears only for the Firebase UID in `PRIVATE_USER_ID`.

### Backend (local)

```bash
# 1. Postgres 16 locally (Docker is simplest)
docker run -d --name elvote-pg -e POSTGRES_USER=elvote -e POSTGRES_PASSWORD=elvote -e POSTGRES_DB=elvote -p 5432:5432 postgres:16

# 2. Configure and run
cd backend
npm install
cp example.env .env      # DATABASE_CLIENT=pg, DATABASE_HOST=localhost, DATABASE_USERNAME/PASSWORD/NAME=elvote
# Firebase Admin key for project elvote-aeb0e → backend/serviceAccountKey.json (gitignored; ask the owner)
npm run run_next_migration   # run 5 times (one migration per call) or until "Already up to date"
npm start                    # http://localhost:3001/api, Swagger at http://localhost:3001/swagger-docs
```

Then set the client's `BASE_URL` (in `constant.js`) to `http://<your-LAN-IP>:3001`. Use your LAN IP rather than `localhost` for a physical device.

**Seeding a tenant locally:** sign in with the super-admin UID, then use the drawer's *Create Constituency* (creates `voters_<C>`) → *Add Political Party* (creates the account and its tables; choose a pass key) → *Create Admin User* → *Upload Voters* (XLSX; format in DATA_MODEL.md § 5).

**Production copy for debugging:** only schema, with `pg_dump --schema-only` over `ssh elvote-api`. Never pull voter rows to a laptop.

## Code conventions

| Area | Rule |
|---|---|
| Files | PascalCase component files; one default export per component; a folder per component under `components/<lowercase>/` |
| Layers | Screen → saga action → saga → `XDataService` → `AppDataService`. Components never import services |
| Saga results | Callbacks in the payload (`onSuccess(data)`, `onComplete()`, `onError(msg)`); guard with `if (response && response.status === 200)` |
| Take effects | Reads: `takeEvery` (parallel widgets) or `takeLatest` (single list). Writes: `takeLeading` |
| Text | `STRINGS.X` only; add keys to `strings.js` with `L({en, hi, mr})` |
| Style | `THEME.*` tokens; `StyleSheet.create`; `useResponsive()` for layout |
| API keys | snake_case on the wire |
| Platform splits | `Name.native.js` + `Name.web.js`; import `./Name` |
| Lists | `components/ui/FlashListCompat` (FlashList on native, measured FlatList on web) |
| Shared UI | `components/ui/` (`EmptyState`, `LoadingState`, `StatCard`, `SectionHeader`, `GradientHeader`, `ComingSoonView`) |

Commit style follows Conventional Commits, as in the git log: `feat(web): …`, `fix(upload): …`.

---

## Recipes

### Add a new preset voter list (e.g. "Age 22–25")

1. Copy `screens/FilteredVoterListScreen/MaleVoterListScreen.js` and change `filtersObj`:
   ```js
   filtersObj={{ [INITIAL_FILTER_SORT.from_voter_age.key]: 22, [INITIAL_FILTER_SORT.to_voter_age.key]: 25 }}
   ```
2. In `strings.js`, add `AGE_22_25_VOTERS_SCREEN_TITLE: L({ en: '…', hi: '…', mr: '…' })`.
3. In `constant.js`, add `AGE_22_25_VOTERS: STRINGS.AGE_22_25_VOTERS_SCREEN_TITLE` to `_ROUTES()`.
4. In `NavigationStack.js`, import the screen and add a `<Stack.Screen name={ROUTES.AGE_22_25_VOTERS} …/>`.
5. In `screens/MenuScreen.js`, add `{ label, route, icon }` to the matching section.
6. Update `docs/FEATURES.md`.

### Add an API endpoint end to end

0. **Backend:** in `backend/src/routes/controllers/<area>.js`:
   ```js
   router.post('/booth_summary', prtWrapper(async (req, res, next) => {
     const { role, account_id, polling_station_id, constituency_number_id } = res.locals[LOCAL_INFO_KEY];
     let { filters = {} } = req.body;
     if (role === DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER) {          // always scope volunteers
       filters = { ...filters, [FILTERS_LIST.polling_station_ids]: [polling_station_id] };
     }
     const booth_summary = await VoterManager.getBoothSummary({ filters, constituency_number_id, account_id });
     res.json({ booth_summary });
   }, []));
   ```
   Add `VoterManager.getBoothSummary` → `VotersModel.getBoothSummary`. In the model, use the query builder or `knex.raw(sql, bindings)`, **never string interpolation** of request values.

1. **Client service:** add a static method in `services/<Area>DataService.js`:
   ```js
   static async getBoothSummary({ filters = {} }) {
     return await AppDataService.post(`${COMMON_BASE}/booth_summary`, { filters });
   }
   ```
2. **Saga:** in `storemanagement/<area>/<Area>Saga.js`, add an action creator, a worker, and register it in `rootSaga`:
   ```js
   getBoothSummary: (payload) => ({ type: 'VOTERS_APPROACHED/GET_BOOTH_SUMMARY', payload }),

   function* getBoothSummaryAsync(action) {
     const { filters, onSuccess = () => {}, onComplete = () => {} } = action.payload;
     const response = yield VotersDataService.getBoothSummary({ filters });
     if (response && response.status === 200) onSuccess(response.data.booth_summary);
     onComplete();
   }
   // rootSaga: takeEvery(getBoothSummary().type, handleErrors(getBoothSummaryAsync)),
   ```
3. **Component:** `dispatch(getBoothSummary({ filters, onSuccess: setData, onComplete: () => setLoading(false) }))` inside a `useEffect` keyed on `JSON.stringify(filters)` and `refreshKey`.
4. **Docs:** add a row to `docs/API.md`. Mark it `PROPOSED` until the backend implements it.

### Add a dashboard widget

1. Create `components/<name>/<Name>.js` that accepts `{ navigation, filters, extraData, refreshKey, style }`. Copy `components/votersmobilecount/VotersMobileCount.js` as a template.
2. Add a boolean prop to `SingleComposite` and render the widget in the right grid section.
3. Turn it on from a screen: `<SingleComposite myWidget={true} …/>`.

### Add a new filter key

1. Add it to `FILTERS_LIST` in `constant.js`.
2. Add `{ label, value: null, callback }` to `_INITIAL_FILTER_SORT` in `FilterSortSlice.js`. The callback produces the chip text shown in `AddedFilterInfo`.
3. Add a filter UI in `components/searchfilterbar/` and wire it into `SearchFilterBar.js`.
4. The **backend must support the key.** Document it in `docs/DATA_MODEL.md § Filters`.

### Add a language

1. In `strings.js`, add a code to `LANGUAGES` and a parameter to `L()` that falls back to `en`.
2. Fill in translations; empty strings fall back to English.
3. Add an option to `screens/LanguageScreen.js`.

### Add a labelled enum

1. Write it as a factory: `export const _MY_ENUM = () => ({ A: { VAL: 'A', LABEL: STRINGS.X } }); export let MY_ENUM = _MY_ENUM();`
2. Add `updateObject(MY_ENUM, _MY_ENUM())` in `LanguageWrapper.js`.

### Add a new state slice

1. Create `storemanagement/<area>/<Area>Slice.js` with a unique `componentKey` and `<Area>Saga.js`, following an existing pair.
2. Import the saga or slice from the screen that uses it. Registration happens on import.
3. Optionally call `useGarbageCollector(componentKey)` in the owning screen to drop state on unmount.

### Database changes

**Static table** (`users`, `accounts`, `polling_station`, …):
1. `cd backend && npm run create_migration -- add_users_last_login`
2. Write `up` and `down`, using `DB_TABLE` constants from `dbConstants.js`.
3. Add the column to `DB_TABLE` in `dbConstants.js`.
4. `npm run run_next_migration` locally, then test.

**Dynamic table** (`voters_<C>`, `data_collection_<C>_<A>`, `live_voting_<C>_<A>`, `polling_station_for_party_<C>_<A>`):
1. Change the `createTable` block in `ConstituencyModel.upsertConstituency` (voters) or `AccountsModel.addAccountAttachConstituency` (the other three), so **new** tenants get the change.
2. Write a migration for **existing** tenants that loops over the matching tables and is idempotent:
   ```js
   exports.up = async (knex) => {
     const { rows } = await knex.raw(
       "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ~ '^data_collection_[0-9]+_[0-9]+$'");
     for (const { table_name } of rows) {
       await knex.raw('ALTER TABLE ?? ADD COLUMN IF NOT EXISTS ?? boolean DEFAULT false', [table_name, 'is_voter_migrated']);
     }
   };
   ```
3. Add the column to `DB_TABLE` and update DATA_MODEL.md.

**Production rollout:** `pg_dump` backup → test the migration on a restored copy → apply during an agreed window (DEPLOYMENT.md). Never run DDL on production without explicit approval.

### Add a role-gated drawer item

In `InitStack.js`, wrap `<Drawer.Screen>` in `userDetails?.role === USER_ROLE.ADMIN && (...)`. **The server must also enforce the role.** Hiding a menu item is not access control.

---

## Verifying changes

The repo has no automated tests. Before you open a PR:

1. `npm run web` and click through the affected flow. Check the browser console for errors.
2. If you touched native-only files, or anything using `Platform.OS`, run on Android as well.
3. Check that the text is correct in all three languages: switch with *Change Language*.
4. Check both roles (admin and volunteer) when you change navigation or drawer items.
