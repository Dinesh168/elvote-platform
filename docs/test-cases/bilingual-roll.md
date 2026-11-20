# Test cases: bilingual roll and roll updates (spec `docs/specs/bilingual-roll.md`)

Status: ⬜ not run · ✅ pass · ❌ fail. api = vitest; unit = Jest; ui = puppeteer.

| ID | Req | Type | Steps | Expected | Status |
|---|---|---|---|---|---|
| TC-BR-L1-1 | L1 | api | Super-admin sets the test AC language hi, then pa; admin token; HR default | `/v1/me` dataLang follows; 'xx' → 422; admin → 403 | ✅ |
| TC-BR-U1-1 | U1/L2 | api | Draft upload (new AC) with regional columns, roll kind draft | voters have nameLocal, relativeLocal, villageLocal; booth nameLocal/address/addressLocal; AC name_local set | ✅ |
| TC-BR-U1-2 | U1 | api | English-only file | works as before (no regional fields) | ✅ |
| TC-BR-U3-1 | U3 | api | Final roll: 3 serial changes, 2 moved booth, 2 new, 2 missing | job ready; summary unchanged/changed/moved/new/notInRoll exact; nothing applied yet | ✅ |
| TC-BR-U3-2 | U3 | api | Cancel a ready job | status cancelled; voters unchanged; confirm afterwards → 422 | ✅ |
| TC-BR-U4-1 | U4 | api | Apply after a party marked a moved voter (group + voted) | same voter id, new booth; contacts/poll marks part_no moved; trace shows the old booth event | ✅ |
| TC-BR-U4-2 | U4 | api | Volunteer with old booth lists voters; volunteer/admin with new booth | moved voter only in the new booth | ✅ |
| TC-BR-U5-1 | U5 | api | After apply | new voters `isNew` true; first upload voters false | ✅ |
| TC-BR-U6-1 | U6 | api | After apply | missing voters hidden from lists/counters; admin `/roll` lists them; trace by EPIC still works | ✅ |
| TC-BR-U6-2 | U6 | api | Upload again including a hidden voter | visible again, same id, history kept | ✅ |
| TC-BR-U2-1 | U2/U7 | api | File has an EPIC visible in another AC | row held; Apply → 422 held_undecided | ✅ |
| TC-BR-U7-1 | U7 | api | Decide Move | voter hidden (moved_out) in old AC, inserted here; old party history kept | ✅ |
| TC-BR-U7-2 | U7 | api | Decide Reject | row skipped; old AC voter unchanged | ✅ |
| TC-BR-U8-1 | U8 | api | Change with clientAt before the move, voter moved from the volunteer's booth | accepted (ok); after-the-move change → booth_forbidden | ✅ |
| TC-BR-U8-2 | U8 | api | Change for a not_in_roll voter in the volunteer's booth | accepted, voter stays hidden | ✅ |
| TC-BR-U9-1 | U9 | api | `/v1/m/:mid/roll` | kind final, publishedOn, counts | ✅ |
| TC-BR-SEC-1 | security | api | Admin calls upload/held/acs language | 403 | ✅ |
| TC-BR-L3-1 | L3 | unit | `localized(v, lang, dataLang)` | regional when lang = dataLang and present; English otherwise | ✅ |
| TC-BR-L3-2 | L3 | unit | search "ਹਰਜੀਤ" / "harjit" | both find the voter | ✅ |
| TC-BR-L4-1 | L4 | unit | hi.json keys = en.json keys | equal | ✅ |
| TC-BR-UI-1 | U3/U7 | ui | Super-admin uploads sample draft, then final: preview counts, held rows Move/Reject, Apply | summary shown; applied | ✅ |
| TC-BR-UI-2 | L3/L4 | ui | Volunteer in Punjabi / Hindi / English | names in the right script; screens translated; axe clean | ✅ |
| TC-BR-UI-3 | U9 | ui | Admin dashboard after the final roll | "Roll: Final · 25 Nov 2026" and "Not in the latest roll (3)" link | ✅ |

**Run 2026-11-20:** backend vitest 130/130 (`test/99-roll.test.ts` 17 — named to run last because it changes shared sample data); Jest 91/91 (`localize.test.ts`, i18n parity for en/hi/pa and placeholders); tsc + ESLint clean (only older warnings); puppeteer `br-ui.js` 13/13 with the generated samples: draft upload → preview → Apply; final upload → preview 3 moved / 4 new / 3 not in roll / 3 changed → Apply; same EPICs for AC 82 → 3 held, Apply disabled until decided, Cancel changes nothing; admin roll line; volunteer in English / Punjabi / Hindi (Punjabi data in Gurmukhi only for the Punjabi app; Hindi screens fall back to English data for a Punjabi-data assembly); Gurmukhi search while in English; axe clean; no page errors. Regression: `web-desktop.js` 17/17, `sync-ui.js` 9/9, `pd-ui.js` 19/19.

Fixed while testing: the voters list could throw "index out of bounds" inside FlashList on the web when a search shortened it (the list is rebuilt per search on the web, and the delayed scroll skips rows that are gone); the group buttons (Our / Target / Opposition) had no `aria-checked`; "Not met" text was 3.3:1 (now 5.1:1); the language switch now cycles ਪੰ → हि → A and says "change language". Not an app issue: full-page screenshots in the test tool briefly emulate another screen and reset forms, so the test uses normal screenshots (real window resizes keep the form).

