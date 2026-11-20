# Bilingual roll data and draft → final roll updates (REQ L1–L4, U1–U9) · status: built (2026-11-20)

Owner (2026-11-20): "I will have two kinds of data — English and the regional language of the state: voter name, relative name, house number, gender, assembly name … Assembly-wise language. In a state there shouldn't be a duplicate EPIC. I may upload the draft of one assembly, give access and volunteers work; after a few days I upload the final version, and without losing any data things update: serial numbers might change, voters added or removed; if a voter is moved from booth one to two the volunteer might be different, but the admin can see who verified him. The voter EPIC won't change at any cost."

## Decisions

| # | Decision |
|---|---|
| BD1 | Regional language is set **per assembly** by the super-admin: **Hindi or Punjabi**; it starts as the state's language (PB = Punjabi, HR = Hindi) |
| BD2 | Bilingual fields: voter **name, relative name, section/locality**; booth **name, address, locality**; **assembly and district name**. Numbers (EPIC, serial, part, house number, age) stay one value |
| BD3 | **The language follows the person**: English → screens and data in English; Hindi/Punjabi → screens and data in that language when the assembly's data is in that language; missing regional text falls back to English. Search matches both scripts |
| BD4 | App screens in **English, Hindi, Punjabi** (Hindi translation added; customers can allow it) |
| BD5 | **EPIC is unique per state** among visible voters and is the voter's identity; all party work stays with it |
| BD6 | A roll update shows a **preview**; nothing changes until the super-admin taps **Apply**; Cancel leaves the old roll |
| BD7 | Voters **not in the new roll** are **hidden but kept** (history and trace stay) |
| BD8 | A row whose EPIC is visible in **another assembly** is **held**; the super-admin chooses **Move** (voter joins this assembly; the old one is hidden there with its history) or **Reject** per row |
| BD9 | Offline changes for a voter who **moved booth** (or left the roll) are **accepted** when they were made before the update and the volunteer had the voter's old booth |

## Built notes
- The slip and every voter screen follow the person's language (BD3); there is no extra "both languages" line.
- Relation words (S/o → पुत्र / ਪੁੱਤਰ) and the address line are translated; gender words were already.
- The language switch on phones cycles through the team's languages (ਪੰ → हि → A); the web sidebar lists them.
- Samples: `backend-v2/samples/pb-ac81-punjabi-{draft,final}.csv`, `hr-ac13-hindi-{draft,final}.csv`, `pb-ac82-epic-clash.csv` (made up; regenerate with `node scripts/make-samples.mjs`).

## Requirements

### L1 Language per assembly
- `assembly_constituencies.regional_lang` ('hi' | 'pa', NULL = the state's language). Super-admin: Booth locations page header shows "Data language: Punjabi" with Change (PATCH `/v1/admin/acs/:state/:ac`); also on the upload page.
- `/v1/me` memberships gain `dataLang` ('hi' | 'pa').

### L2 Stored fields
- voters: `name_local` (exists), `relative_name_local`, `section_local`.
- booths: `name_local` (exists), `address_local`, `locality_local`.
- assembly_constituencies / districts: `name_local` (exist). Upload sets the assembly's `name_local` when given.

### L3 Display and search
- API returns both (`name`, `nameLocal`, `relative`, `relativeLocal`, `village`, `villageLocal`; booths `name`, `nameLocal`, `address`, `addressLocal`, `village`, `villageLocal`).
- The app shows the regional value when the app language equals the membership's `dataLang` and the value exists; otherwise English. Applies to voter lists, voter card, next voter, house view, slip, booth names, polling-day and admin booth lists.
- Search: a voter matches when the text is found in the English **or** the regional name/relative name, or the EPIC/serial.
- *Given* a Punjabi app and a Punjab voter with ਹਰਜੀਤ ਸਿੰਘ, *then* the card shows ਹਰਜੀਤ ਸਿੰਘ; in English it shows Harjit Singh; typing "ਹਰਜੀਤ" or "harjit" finds it.

### L4 Hindi screens
- `hi.json` with every key of `en.json` (key-parity test); language pickers offer English / हिन्दी / ਪੰਜਾਬੀ; customer `languages` may include `hi`. Devanagari font loaded like Gurmukhi.

### U1 Upload columns and roll type
- Optional columns: `name_local`, `relative_name_local`, `section_local`, `booth_name_local`, `booth_address`, `booth_address_local`, `locality_local`; extra form fields `rollKind` (draft | final | supplement, default draft), `publishedOn` (date, optional), `acNameLocal`.
- Existing English-only files work unchanged.

### U2 EPIC unique per state
- Within one file: repeated EPIC → row error (exists).
- Against other assemblies: an EPIC visible in another assembly of the state → the row is **held** (BD8).
- On Apply the server re-checks under a per-state lock, so two uploads at once cannot create a duplicate.

### U3 Preview → Apply / Cancel
- After checking, the job is `ready` with a **summary**: `unchanged`, `changed` (any detail), `moved` (booth changed), `new`, `notInRoll` (visible voters of this assembly missing from the file), `held`, plus `failed` rows.
- Lists (first 200 each) for moved (EPIC, name, from → to booth), new, not in roll, held (EPIC, name, other AC).
- **Apply** (`/confirm`) is refused while any held row has no decision (422 `held_undecided`). **Cancel** sets the job `cancelled`; nothing changes.

### U4 Booth move
- The voter row is updated (same id), so the party's work stays. Every party's `voter_contacts.part_no` and `poll_marks.part_no` move with it; counters of the old and new booths are rebuilt. `contact_events` keep the booth at the time of each change, so the trace shows who verified the voter and at which booth.
- `voters.prev_part_no`, `voters.moved_at` record the last move (for BD9).

### U5 New voters
- `voters.is_new` = true when inserted by an upload into an assembly that already had voters; false for the first upload and once a later roll includes the voter again. API `isNew`; the app shows a "New in final roll" tag (voter card/list) for that roll.

### U6 Not in the new roll
- Visible voters of the assembly missing from the file get `status = 'not_in_roll'`: hidden from volunteer lists and searches, excluded from counters, kept for trace. A later roll that includes them again makes them visible again (same id and history).
- Admin: Dashboard → "Not in final roll (25)" list (name, EPIC, booth) via `/v1/m/:mid/roll` (includes roll version and counts).

### U7 Held EPIC decisions
- `import_held (job_id, row_no, epic, other_ac, other_voter_id, decision)`. `POST /v1/admin/imports/:id/held?state=` `{ decisions: [{ rowNo, decision: 'move' | 'reject' }] }` or `{ all: 'move' | 'reject' }`.
- Move: the other assembly's voter gets `status = 'moved_out'` (hidden there, history kept) and the row is inserted here as a new voter. Reject: the row is skipped.

### U8 Offline changes after an update (BD9)
- `applyChange` accepts a change for a voter whose current booth is not the volunteer's when `prev_part_no` is one of the volunteer's booths and the change's phone time is before `moved_at`; and for `not_in_roll` / `moved_out` voters in the volunteer's (current or previous) booth. History records the volunteer and booth.

### U9 Roll version
- `roll_versions.kind` (draft | final | supplement), `published_on`; the latest applied is `is_current`. `/v1/m/:mid/roll` returns `{ kind, publishedOn, appliedAt, notInRoll, newCount }`; the admin dashboard header shows "Roll: Final · 15 Jan 2026".

## Data / API changes
- State migration `004_bilingual_roll.sql`: columns above; voter status adds `not_in_roll`, `moved_out`; `import_held`; `import_jobs.summary jsonb`, `roll_kind`, `published_on`, `ac_name_local`; partitioned index `voters (epic)`.
- Every voter list/count uses visible = `status IN ('active','added')`.
- Samples: `backend-v2/samples/` PB (Punjabi) and HR (Hindi), draft + final, made-up data.

## Non-functional
- Security: super-admin only for uploads/decisions; party scope (RLS) unchanged; no voter data in logs.
- Performance: preview is set-based SQL on the staging table (≈300k rows per AC in seconds); indexes on `voters (ac_no, epic)` (exists) and `voters (epic)`.
- Offline: older app versions ignore the new fields; English always present.
- i18n: en/hi/pa key parity; fonts for Gurmukhi and Devanagari.
- a11y: new screens axe-clean.

## Out of scope
- SIR form fields (DOB, 2002/03 link, form status), photos, Aadhaar; moving party work between assemblies (each assembly is a separate customer).
