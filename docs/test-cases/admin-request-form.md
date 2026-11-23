# Test cases: admin request form (spec docs/specs/admin-request-form.md)

| TC | REQ | Steps | Expected | Type |
|---|---|---|---|---|
| TC-AR-1 ✅ | A1/A3 | Pick party Jan Vikas Party, state PB, whole state, position Candidate, send | request has partyId p1, partyName, designation "Candidate" (English) | ui |
| TC-AR-2 ✅ | A1/A3 | Party "My party is not listed" → type "Lok Morcha"; position Other → "Halqa incharge" | partyId undefined, partyName "Lok Morcha", designation "Halqa incharge" | ui |
| TC-AR-3 ✅ | A3 | Everything but position | Send disabled; Other with 1 letter still disabled | ui |
| TC-AR-4 ✅ | A1 | Party search "vik" | only matching parties listed | ui |
| TC-AR-5 ✅ | A4 | i18n test | en/hi/pa have all new keys, none empty | unit |
| TC-AR-6 | A1–A4 | Demo, phone + web, Hindi | dropdowns open, list scrolls, keyboard does not hide boxes | manual |

Automated: src/features/auth/register.test.tsx (TC-AR-1..4), i18n test (TC-AR-5); app 140/140. Deployed to demo 2026-11-23 (EAS 0a6c8d2a). TC-AR-6 needs a phone (owner).
