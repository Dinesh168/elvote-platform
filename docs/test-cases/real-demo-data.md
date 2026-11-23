# Test cases: real demo data (spec docs/specs/real-demo-data.md)

| TC | REQ | Steps | Expected | Type |
|---|---|---|---|---|
| TC-RD-1 ✅ | B3 | Admin (JVP AC 66, results loaded) resets booth 101 strength, reads booth table | 101 = S, strengthSource auto (JVP won by ≥ 100) | api |
| TC-RD-2 ✅ | B3 | Admin sets booth 101 to W | W, strengthSource admin | api |
| TC-RD-3 ✅ | B3 | Reset again | S, auto | api |
| TC-RD-4 ✅ | B3 | Booth 113 (lost by 200) reset | W auto; booth 112 (won by 20) → M | api |
| TC-RD-5 ✅ | B3 | Volunteer calls reset | 403 | api |
| TC-RD-6 ✅ | B3 | Dashboard strength counts after resets | strong/moderate/weak include the worked-out values | api |
| TC-RD-7 ✅ | O1 | Migrate on a fresh DB | `t_elvote_up` exists, state UP listed in /v1/admin/overview | api |
| TC-RD-8 ✅ | B1 | Booth with is_estimated | booth trend `estimated: true` | api |
| TC-RD-9 ✅ | V1/D1 | Prepared voter file | no column with real names / EPIC / relatives; EPIC all `ZZD…` | manual (script check) |
| TC-RD-10 ✅ | O2–O5 | Demo after load | parties AAP/INC/SAD/BJP/SP/BSP; teams AAP-PB50, BJP-UP361; 236 / 394 booths; 234 / 291 with location | manual (counts) |

Automated: backend-v2/test/95b-strength.test.ts (7); server suite 193/193; app 136/136. TC-RD-9/10 checked by the prep and load counts (2026-11-23): PB 50 236 booths (234 located) 169,377 voters, all EPIC ZZD…; UP 361 394 booths (291 located) 78,800 voters; parties AAP, BJP, BSP, INC, SAD, SP.
