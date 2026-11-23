# Test cases: parties by state (spec docs/specs/party-states.md)

| TC | REQ | Steps | Expected | Type |
|---|---|---|---|---|
| TC-PS-1 ✅ | A2 | Parties with no states, catalog PB and HR | listed in both | api |
| TC-PS-2 ✅ | A2/A3 | Set Lok Sewa Dal → [HR]; catalog PB/HR/all; admin list; then [] | not in PB, in HR and all; states [HR]; back in PB | api |
| TC-PS-3 ✅ | A3 | states [XX]; admin (not super) sets | 422; 403 | api |
| TC-PS-4 ✅ | A3 | Approve request with new party "Kisan Morcha" in PB | in PB catalog, not HR | api |
| TC-PS-5 ✅ | A1 | Register as admin before a state | party locked "Choose your state first"; after Punjab, party list opens | ui |
| TC-PS-6 | A2/A3 | Demo: Punjab vs UP party lists; super-admin Parties page | PB: AAP, BJP, BSP, INC, SAD; UP: AAP, BJP, BSP, INC, SP | manual |

Automated: backend-v2/test/98-access.test.ts (TC-PS-1..4), src/features/auth/register.test.tsx (TC-PS-5); server 199/199, app 140/140.
