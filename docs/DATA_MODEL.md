# Data model

**Database:** PostgreSQL. It is accessed only by the backend (`backend/`) through **Knex** (`backend/knexfile.js`, `pg` driver). Schema `public`.

**Sources of truth, in order:**
1. `backend/src/models/libs/dbConstants.js`: every table name, column, enum value and dynamic-table name builder (`DB_TABLE`)
2. `backend/src/models/migrations/*.js`: static tables (Knex migrations)
3. `backend/src/models/ConstituencyModel.js` and `AccountsModel.js`: **runtime** `CREATE TABLE` for the per-constituency and per-account tables

> Status: derived from backend source **and verified against the live production DB on 2026-11-17** (read-only session). The column names and types of every static and dynamic table match the code. Live-state findings, including schema drift, are in [§ 9](#9-live-database-snapshot-2026-11-17).

## 1. Two kinds of tables

| Kind | Created by | Tables |
|---|---|---|
| **Static** (Knex migrations) | `npm run run_next_migration` | `accounts`, `constituency`, `polling_station`, `users`, `constituency_account_mapping`, `permissions`, `permissions_template`, `district`, `zones`, `polling_station_zone_mapping` |
| **Dynamic** (created at runtime, **not** in migrations) | API calls | `voters_<C>`, `data_collection_<C>_<A>`, `live_voting_<C>_<A>`, `polling_station_for_party_<C>_<A>` |

`<C>` is the constituency number and `<A>` is `accounts.id`.

- `voters_<C>` is created by `POST private/create_constituency` (`ConstituencyModel.upsertConstituency`), on first insert only. One voters table per constituency is **shared by every party account** in that constituency.
- `data_collection_<C>_<A>`, `live_voting_<C>_<A>` and `polling_station_for_party_<C>_<A>` are created by `POST private/create_account` (`AccountsModel.addAccountAttachConstituency`). Each party gets its own private canvassing data per constituency.

⚠ **Migrations don't cover dynamic tables.** To change a voter or canvassing column you must:
1. change the `createTable` code in the model (for future tables), **and**
2. write a migration that loops over every existing table matching the pattern (`SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'voters\_%'`) and alters each one.

## 2. Entity relationship

```
district (district_code) 1──< constituency (constituency_number, district_code)
                                   │ 1
         ┌─────────────────────────┼──────────────────────────────┐
         ▼ *                       ▼ *                            ▼ 1
  polling_station           constituency_account_mapping     voters_<C>   (shared roll)
  (part_no, constituency_   (constituency_number_id,              │ id
   number_id)                account_id)                          │
         │ 1                       │ *                              │
         │                         ▼ 1                              │
         │                     accounts (party; pass_key)           │
         │                         │ 1                              │
         │ 0..1                    ▼ *                              │
         └──────────────────── users (role, account_approved_status,│
                                     polling_station_id)            │
                                   │ id = volunteer_id              │ voter_id
                                   ▼                                ▼
                   data_collection_<C>_<A>  (one row per voter approached)
                   live_voting_<C>_<A>      (one row per voter marked voted)
                   polling_station_for_party_<C>_<A> (booth strength by part_no)

zones (constituency_number_id, account_id) 1──< polling_station_zone_mapping >──1 polling_station
permissions, permissions_template            (permissions_template.name = role; users.permissions_list copied from it)
```

⚠ **Foreign-key naming quirk:** every column called `constituency_number_id` holds the **constituency_number** (business key, for example 7), **not** `constituency.id`. Real FKs reference `constituency.constituency_number`. Exception: `zones.constituency_number_id` FK → `constituency.id` (inconsistent, from the 2025-11 migration).

Every table has `id serial PK`, `is_deleted boolean default false` (soft delete) and `created_at`/`updated_at timestamptz default now()`, from `table.timestamps(true, true, false)`. These are omitted below.

## 3. Static tables

### `accounts`: political party / tenant
| Column | Type | Notes |
|---|---|---|
| `name` | varchar NOT NULL | |
| `pass_key` | varchar NOT NULL **UNIQUE** | Shared join code. Volunteers enter it in onboarding; super-admin ops target an account by it. Stored in plaintext |
| `other_data` | jsonb | |

### `constituency`
| Column | Type | Notes |
|---|---|---|
| `name` | varchar NOT NULL | |
| `constituency_number` | int NOT NULL **UNIQUE** | Business key; the client sends it as `x-constituency` |
| `district_code` | varchar(5) FK → `district.district_code` | Added 2025-11 |
| `other_data` | jsonb | |

Seeded from `backend/districtdata/assembly.json` (migration `20251123183146`).

### `district` *(2025-11)*
`name` NOT NULL, `state_code varchar(3)` NOT NULL, `district_code varchar(5)` NOT NULL UNIQUE, `other_data` jsonb. Seeded from `districtdata/district.json`.

### `polling_station`: booth / roll part
| Column | Type | Notes |
|---|---|---|
| `name` | varchar NOT NULL | |
| `part_no` | int NOT NULL | |
| `address` | varchar | |
| `constituency_number_id` | int NOT NULL FK → `constituency.constituency_number` | |
| | | Partial unique index `(part_no, constituency_number_id, is_deleted) WHERE is_deleted=false` |

Shared by all accounts in a constituency. Created or extended by the XLSX upload.

### `users`
| Column | Type | Notes |
|---|---|---|
| `unique_id` | varchar NOT NULL UNIQUE | **Firebase UID** |
| `name` | varchar NOT NULL | |
| `email` | varchar NOT NULL UNIQUE | |
| `mobile` | varchar(15) UNIQUE | Added by migration `20240825` |
| `role` | varchar NOT NULL default `'volunteer'` | `volunteer` \| `admin` |
| `photo` | varchar | |
| `permissions_list` | jsonb | Must be a **non-empty object**, or the API returns 413 |
| `account_approved_status` | varchar NOT NULL default `'pending'` | `pending` (411) \| `approved` \| `rejected` (412) |
| `polling_station_id` | int FK → `polling_station.id` | Set when an admin approves; scopes volunteer queries |
| `account_id` | int NOT NULL FK → `accounts.id` | |
| `other_data` | jsonb | |

### `constituency_account_mapping`
`constituency_number_id` FK → `constituency.constituency_number`, `account_id` FK → `accounts.id`. Partial unique `(constituency_number_id, account_id, is_deleted) WHERE is_deleted=false`. `GET constituency` lists the constituencies mapped to the caller's account.

### `permissions` / `permissions_template`
`permissions(name, type)`, where `type` ∈ `normal` | `private` (default `normal`). `permissions_template(name, permissions_list jsonb NOT NULL)`, with name ∈ `volunteer` | `admin`, unique where not deleted. The template is copied into `users.permissions_list`. The client stores `permissions_list` but doesn't use it.

### `zones`, `polling_station_zone_mapping` *(2025-11, not used by the API yet)*
`zones(name, other_data, constituency_number_id FK→constituency.id, account_id FK→accounts.id)`; `polling_station_zone_mapping(polling_station_id FK, zone_id FK)`. Groups booths into campaign zones.

## 4. Dynamic tables

### `voters_<C>`: electoral roll (shared per constituency)
| Column | Type | Index | Notes |
|---|---|---|---|
| `sno` | smallint NOT NULL | ✔ | Serial number in the part |
| `name` | varchar NOT NULL | ✔ | Title-cased on import |
| `age` | smallint | ✔ | Non-numeric becomes NULL |
| `gender` | char(1) | ✔ | `M` \| `F` \| `O` |
| `relative_name` | varchar | | |
| `relative_relation` | varchar(20) | | |
| `epic` | varchar(18) NOT NULL **UNIQUE** | | Voter ID; upload dedupes on it (`ON CONFLICT (epic) DO NOTHING`) |
| `address` | varchar | | Built as `"<house_no>, <section>"` |
| `part_no` | smallint NOT NULL | ✔ | Joins to `polling_station.part_no` (no FK) |
| `constituency_number_id` | smallint NOT NULL | | |
| `mobile_number` | varchar(15) | | From the roll or import |
| `caste` | varchar(30) | ✔ | **Free text from the XLSX** (`castes_list` endpoint returns `General`, `OBC`, `SC/ST`) |
| `religion` | char(1) | ✔ | `H` \| `M` \| `S` \| `C` \| `O` (mapped from words on import) |

There is no FK to `polling_station`; the join is `(constituency_number_id, part_no)`.

### `data_collection_<C>_<A>`: canvassing record (one per approached voter)
| Column | Type | Notes |
|---|---|---|
| `volunteer_id` | int NOT NULL (index) | `users.id` of the volunteer who approached |
| `voter_id` | int NOT NULL | `voters_<C>.id` (no FK) |
| `opinion` | char(1) NOT NULL (index) | `P` positive · `N` negative · `U` undecided · `O` other |
| `mobile_number` | varchar(15) | Number captured by the volunteer |
| `is_voter_migrated` | boolean default false (index) | |
| `constituency_number_id`, `account_id` | smallint NOT NULL | |
| | | Partial unique `(voter_id, is_deleted) WHERE is_deleted=false`: one live record per voter |

"Approached" means a non-deleted row exists. "Approached on day X" uses `created_at`; the `from_epoch` and `to_epoch` filters apply to it.

### `live_voting_<C>_<A>`: polling day
`volunteer_id` (index), `voter_id`, `constituency_number_id`, `account_id`; partial unique `(voter_id, is_deleted) WHERE is_deleted=false`. A row means the voter **has voted**.

### `polling_station_for_party_<C>_<A>`
`part_no smallint NOT NULL`, `booth_strength char(1) NOT NULL` ∈ `S` strong · `M` moderate (the default on import) · `W` weak; partial unique `(part_no, is_deleted) WHERE is_deleted=false`.

## 5. Voter XLSX import format (`POST private/upload_voters_data`)

First sheet, header row skipped, columns by **position**:

| # | Column | → stored as |
|---|---|---|
| 1 | constituency_number | `voters.constituency_number_id`, `polling_station.constituency_number_id` |
| 2 | part_no | `part_no` |
| 3 | sno | `sno` |
| 4 | voter name | `name` (title-cased) |
| 5 | relative's name | `relative_name` |
| 6 | relative's relation | `relative_relation` |
| 7 | age | `age` (non-numeric → NULL) |
| 8 | gender | `M`/`F` from Male/M/Female/F, otherwise `O` |
| 9 | house no | `address = "<house_no>, <section>"` |
| 10 | EPIC | `epic` (dedupe key) |
| 11 | section | (address) |
| 12 | polling station name | `polling_station.name` |
| 13 | polling station address | `polling_station.address` |
| 14 | mobile | `voters.mobile_number` |
| 15 | religion | Hindu/Muslim/Sikh/Christian → `H/M/S/C`, otherwise `O` |
| 16 | caste | `caste` (as is) |
| 17 | booth strength | Strong/S → `S`, Weak/W → `W`, otherwise `M` |
| 18 | approached | `true` → creates a `data_collection` row |
| 19 | opinion | `P/N/U/O` (anything else → `O`) |
| 20 | collected mobile | `data_collection.mobile_number` |

Imported "approached" rows are attributed to the approved volunteer assigned to that part. `clear_voters_data` first exports the canvassing data to `backend/src/routes/controllers/sheets/data_collection_<C>_<A>.xlsx` (EPIC, true, opinion, mobile, migrated), so it can be re-imported, then **TRUNCATEs** `voters_<C>` and `data_collection_<C>_<A>`. ⚠ Truncating the shared `voters_<C>` also wipes the roll for every other party in that constituency.

## 6. Enums: client ↔ DB

| Concept | DB values | Client constant | Match? |
|---|---|---|---|
| Opinion | `P N U O` | `VOTER_OPINION` | ✅ |
| Gender | `M F O` | `GENDERS` | ✅ |
| Religion | `H M S C O` | `RELIGIONS` | ✅ |
| Caste | free text (`General`, `OBC`, `SC/ST` per `castes_list`) | `CATEGORIES` = `G B C T O` | ⚠ **Mismatch.** Client presets filter `caste IN ('G')` etc. Moot today, because live caste data is empty (§ 9), but decide on one coding before the next import |
| Booth strength | `S M W` | `BOOTH_STRENGTH` = `S M W O` | ✅ (`O` unused) |
| Role | `volunteer admin` | `USER_ROLE` | ✅ |
| Approval | `pending approved rejected` | (status codes 411/412) | ✅ |
| List type | `TOTAL_VOTERS APPROACHED_VOTERS` | `LIST_TYPE` (+`LIVE_VOTING`) | Client-only extra value |

## 7. Filters

The `filters` body object is applied in `backend/src/models/VotersModel.js` and `UsersModel.js`. Keys are listed in `FILTERS_LIST` (dbConstants.js, mirrored in the client's `constant.js`).

| Key | Type | SQL effect |
|---|---|---|
| `polling_station_ids` | int[] | Mapped to `part_no`s, then `part_no IN (…)` |
| `part_nos` | int[] | `part_no IN` |
| `voter_ids`, `sno`, `voter_epic`, `voter_name`, `voter_address` | | Exact or ILIKE match |
| `from_voter_age` / `to_voter_age` | int | range |
| `voter_genders`, `voter_castes`, `voter_religions` | string[] | `IN` |
| `voter_opinions` | `P/N/U/O`[] | `id IN (SELECT voter_id FROM data_collection… WHERE opinion IN …)` |
| `is_voter_approached` | bool | `id [NOT] IN (SELECT voter_id FROM data_collection…)` |
| `is_voter_mobile_number` | bool | mobile in voters **or** data_collection |
| `is_voter_migrated` | bool | data_collection.is_voter_migrated |
| `is_voter_voted` | bool | `id [NOT] IN live_voting…` |
| `from_epoch` / `to_epoch` | int (UTC seconds) | data_collection.created_at range |
| `volunteer_ids`, `volunteer_name`, `volunteer_roles`, `account_ids`, `account_name`, `pass_keys`, `account_approved_statuses`, `data_collection_ids` | | User and account filters |
| `list_type` | `TOTAL_VOTERS` \| `APPROACHED_VOTERS` | Which population the counts use |

**Volunteers are always scoped server-side** to their own `polling_station_id`. The server overrides `polling_station_ids` for the `volunteer` role in list and count routes.

Page size: **50** rows (`limit = 50` default in the models), `page_num` starts at 1.

## 8. Data sensitivity

Voter rows combine caste, religion and inferred political opinion with name, address, age and phone. Under India's DPDP Act 2023 this is sensitive personal data. Never log rows, never commit DB dumps or `sheets/*.xlsx` exports, and keep the database unreachable from the internet. See [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).

## 9. Live database snapshot (2026-11-17)

PostgreSQL **16.15** (Ubuntu 24.04), database `elvote`, user `elvote`, **146 MB**. All 5 Knex migrations applied (last: `20251123183146_constituency_insert`, 2025-11-23).

**Tenants** (`constituency_account_mapping`, all active):

| account_id | constituency | created | voters_<C> rows | Notes |
|---|---|---|---|---|
| 1 | 187 | 2024-05 | 0 | |
| 4 | 187 | 2024-05 | 0 | Shares `voters_187` with account 1 |
| 5 | 22 | 2024-06 | 0 | |
| 6 | 9999 | 2024-08 | 0 | Test constituency |
| 7 | 24 | 2024-08 | 1,186 | |
| 11 | 66 | 2026-07 | **277,776** | Main live dataset; 294 polling stations |
| 12 | 50 | 2026-10 | **170,656** | 234 polling stations |

`voters_58` exists with no account mapped to it (orphan). Reference data: 4,137 constituencies and 776 districts (seeded). Users: 14 (7 admins, 7 volunteers). `permissions` and `permissions_template` are empty.

**Data findings:**
- ⚠ **`caste` and `religion` are empty for every voter** in `voters_50` and `voters_66` (NULL or `''`). Caste and religion charts, filters and preset lists show nothing on production data. Gender is populated (M/F/O).
- Booth strength is populated (account 11: S 114 / M 55 / W 125).
- Canvassing volume is low so far: tens of `data_collection` rows per account.

**Schema drift between dynamic tables** (older tenants were created before columns and tables were added to the `createTable` code):

| Drift | Affected | Impact |
|---|---|---|
| `data_collection_*` missing `is_voter_migrated` | accounts 1, 4, 5, 6 (`_187_1`, `_187_4`, `_22_5`, `_9999_6`) | Migration-status filter, counts and setter fail with a 500 for these tenants |
| No `live_voting_<C>_<A>` table | accounts 1, 4, 5, 6 | Polling-day endpoints fail |
| No `polling_station_for_party_<C>_<A>` | accounts 1, 4, 5 | Booth strength is empty (handled: the code checks that the table exists) |
| `data_collection_187_1` has no unique `(voter_id)` index; `_187_4` uses an un-suffixed index name | accounts 1, 4 | Duplicate canvassing rows are possible for account 1 |

Fix: a one-time Knex migration that brings every dynamic table up to the current `createTable` definition, using `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS`. Better, consolidate the tables (PRODUCTION_READINESS B9).

## backend-v2: past results and reminders (spec map-trend, 2026-11-23)
- State DB `past_booth_results (ac_no, year, part_no PK, booth_name, district, tehsil, village, total_votes, electors, is_sample, loaded_by, loaded_at)`
  and `past_party_votes (ac_no, year, part_no, party_code PK, votes)` (cascade on delete). Matched to `booths` by (ac_no, part_no) at read time.
  Loaded only by the super-admin upload. Public aggregate data; no voter rows.
- `past_booth_results.is_estimated` (state 006): votes estimated, not from Form 20. State **UP** (`elvote_up`, state no. 9) added to `LOCAL_STATES`.
- Booth strength: `booth_party_info` row = set by the admin; no row = worked out from the last result for the team's party (S won by ≥ 100, W lost by > 100, else M).
- Core DB `reminders_sent (party_constituency_id, user_id, sent_by, template, sent_at)` (12 h limit) and
  `party_constituencies.daily_target smallint default 25` (volunteer daily target ring).

## Verifying against the live DB

The DB runs on the DigitalOcean droplet (`ssh elvote-api` → `64.227.142.163`) and listens on `localhost:5432` only. Run `psql` on the droplet over SSH, or open a tunnel: `ssh -N -L 5433:localhost:5432 elvote-api`, then connect to `localhost:5433`. Always connect read-only (`PGOPTIONS='-c default_transaction_read_only=on'`). These checks don't touch voter PII:

```sql
-- all tables incl. dynamic ones, with sizes
SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY relname;
-- applied migrations
SELECT name, migration_time FROM knex_migrations ORDER BY id;
-- columns of a dynamic table
\d voters_<C>
-- distinct caste values actually stored (aggregate only)
SELECT caste, count(*) FROM voters_<C> GROUP BY 1;
```

### core.party_states (spec party-states, migration core/009)
| column | type | note |
|---|---|---|
| party_id | uuid | FK parties, cascade |
| state_code | char(2) | FK states, cascade |
PK (party_id, state_code). A party with no rows is national (shown in every state).
