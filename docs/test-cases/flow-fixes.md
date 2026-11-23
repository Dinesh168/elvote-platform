# Test cases: flow fixes (spec docs/specs/flow-fixes.md)

| TC | REQ | Steps | Expected | Type |
|---|---|---|---|---|
| TC-PF-1/2 ✅ | P1 | Volunteer finds booth 101 S.No 1, then by EPIC (lower case) | found, own false, no group/mobile; same voter by EPIC; own booth → own true | api |
| TC-PF-3 ✅ | P2 | In window: mark Voted for booth 101; change group | 200 and voted true; 403 for group; undo 200 | api |
| TC-PF-4 ✅ | P2 | Window closed: mark Voted for booth 101 | 403 | api |
| TC-PF-5 ✅ | P1 | No EPIC / booth only | 422 | api |
| TC-FF-1 ✅ | O1 | Volunteer Home on a 390×650 screen | Next voter + Start meeting visible without scrolling | manual (web) |
| TC-FF-2 ✅ | O1 | Poll day on 390×650 | Full keypad + ✓ Voted visible; typed serial shows the voter above it | manual (web) |
| TC-FF-3 ✅ | O1 | Admin Team | team bar; Review / Approve per request; tab label not cut | manual (web) |
| TC-FF-4 ✅ | O3 | Dashboard donuts, Trend charts | render, legends readable, numbers in a11y label | manual (web) |
| TC-FF-5 | O2 | iPhone + Android (Expo Go), mobile Safari | bottom menu fully visible | manual (owner) |

Automated: backend-v2/test/9-polling.test.ts (TC-PF-1..5); server 203/203; app 140/140; tsc + eslint clean.
