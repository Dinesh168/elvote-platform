# Test cases: state dropdown + keyboard (spec docs/specs/states-keyboard.md)

| TC | REQ | Steps | Expected | Type |
|---|---|---|---|---|
| TC-SK-1 ✅ | O1 | `statesFor('PB,UP')` | PB, UP only; `''` → PB, HR, UP; unknown code ignored | unit (server) |
| TC-SK-2 ✅ | A1 | Select with 3 options, tap, pick 2nd | sheet opens, onChange(2nd), ✓ on chosen | unit |
| TC-SK-3 ✅ | A1 | Select with 1 option | shows its name, not a button | unit |
| TC-SK-4 ✅ | A2 | useStateChoice: last pick UP saved, options PB/UP | starts on UP; options PB only → PB | unit |
| TC-SK-5 ✅ | O1 | Demo after deploy: /v1/states, super-admin pages | Punjab, Uttar Pradesh only | manual |
| TC-SK-6 | V1 | iPhone + Android: Join → tap Team code | box + Continue visible above keyboard | manual |
| TC-SK-7 | V2 | Sign-in phone/code, Register as admin, booth edit sheet | focused box visible | manual |
| TC-SK-8 | V3 | Keyboard open, drag screen | keyboard closes | manual |

Automated: backend-v2/test/95c-states.test.ts (2), src/design/components/select.test.tsx (3); server 195/195, app 139/139.
TC-SK-5: demo core states = PB, UP (2026-11-23). TC-SK-6..8 need a phone (owner).
