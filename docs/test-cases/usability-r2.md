# Test cases: usability round 2 (spec `docs/specs/usability-r2.md`)

Status: ⬜ not run · ✅ pass · ❌ fail.

| ID | Req | Type | Steps | Expected | Status |
|---|---|---|---|---|---|
| TC-R2-1 | B1 | unit | `appendFile` on native with `{uri,name,type}` | appends an `expo-file-system` File (Blob), not a `{uri}` object | ✅ |
| TC-R2-2 | B1 | manual | APK: admin saves a banner; super-admin uploads a logo | uploads succeed; banner on Home | ⬜ |
| TC-R2-3 | R1 | api | Admin user sends a volunteer join request | 409 `role_conflict` | ✅ |
| TC-R2-4 | R1 | api | Volunteer user sends an admin access request | 409 `role_conflict` | ✅ |
| TC-R2-5 | R1 | ui | Volunteer opens Register as admin | explanation shown; no request sent | ⬜ |
| TC-R2-6 | H1 | ui | Home, Voters, Me, Dashboard, More (phone) | team bar + large title; Home summary card with ring and counts | ⬜ |
| TC-R2-7 | H2 | unit | Sync status with 0 / 3 pending / offline / error | icon / amber "3 to send" / grey "Offline · 3 saved" / red "Not sent" | ⬜ |
| TC-R2-8 | U1 | unit | Sign out with 0 and with 3 unsent | pop-up; with unsent: count + Send now; Cancel keeps signed in | ⬜ |
| TC-R2-9 | U1 | unit | Delete account with unsent | red warning that work will be lost | ⬜ |
| TC-R2-10 | U2 | ui | Open each pushed screen (surnames, banner, join, sync, assemblies…) | visible Back at top left works | ⬜ |
| TC-R2-11 | U3 | unit | Number field focused | Done bar shown; Done closes keyboard | ⬜ |
| TC-R2-12 | U4 | unit | Type 357, ✕; type 357, Clear key; Mark voted | empty after each | ⬜ |
| TC-R2-13 | J1 | unit | Scanner reads `https://demo.champn.in/join/JVP6AB` | code JVP6AB filled, team looked up | ✅ |
| TC-R2-14 | J2 | ui | Valid code | party/state/AC read-only; booths multi-select; Send request · N | ⬜ |
| TC-R2-15 | J3 | ui | Admin More → Team QR code | QR + code + Share | ⬜ |
| TC-R2-16 | A1 | unit | State with 300 assemblies; search "66"; select 3; Whole state | filtered; chips + "3 of 300"; whole-state mode | ✅ |
| TC-R2-17 | A2 | api | Admin GET surnames; volunteer token; other team | counts per surname (met, our); 403; 403 | ✅ |
| TC-R2-18 | A2 | ui | Dashboard → Surnames → tap Singh | voters list filtered to Singh | ⬜ |
| TC-R2-19 | S1 | api | Super-admin lists volunteer requests across teams; approves one | listed oldest first; approved; non-super 403 | ✅ |
| TC-R2-20 | S2 | api | Super-admin approves a volunteer in a team as admin | allowed; audit actor = super-admin | ✅ |
| TC-R2-21 | all | unit | en/hi/pa key parity | equal | ✅ |
| TC-R2-22 | all | ui | axe on changed screens | no serious/critical | ⬜ |

Lean finish (owner's request, 2026-11-21): automated checks above pass (app 133/133, server 167/167). The ⬜ items are checked by the owner on the phone with the new APK (no emulator, no browser walk-through this round).
