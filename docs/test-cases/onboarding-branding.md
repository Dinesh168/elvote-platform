# Test cases: first launch, branding, team banner (spec `docs/specs/onboarding-branding.md`)

Status: ⬜ not run · ✅ pass · ❌ fail.

| ID | Req | Type | Steps | Expected | Status |
|---|---|---|---|---|---|
| TC-OB-1 | OB1 | unit | Start route, signed out, `onboarded` false / true | `/welcome` / `/login` | ✅ |
| TC-OB-2 | OB1/OB2 | unit | Welcome screen | English title + Hindi line; Continue and Skip go to `/language` | ✅ |
| TC-OB-3 | OB3 | unit | Choose Hindi, Continue | prefs lang `hi`, `langChosen` and `onboarded` true; goes to `/login` | ✅ |
| TC-OB-4 | OB4/OB5 | unit | Sign-in screen (phone) | ElVote brand header shown; no language button | ✅ |
| TC-OB-5 | OB6 | unit | Language row: open, pick Punjabi | language changes; row shows ਪੰਜਾਬੀ | ✅ |
| TC-OB-6 | OB8 | api | Admin uploads a PNG banner; `/v1/me` look | 200 url; `look.bannerUrl` set; file served | ✅ |
| TC-OB-7 | OB8 | api | Not an image; > 2 MB; volunteer token; other team's admin | 422 not_image; 422 file_too_big; 403; 403 | ✅ |
| TC-OB-8 | OB8 | api | Admin deletes the banner | `bannerUrl` null; audit row | ✅ |
| TC-OB-9 | OB8 | api | Super-admin upload `kind=banner` | customer `bannerUrl` set | ✅ |
| TC-OB-10 | OB8 | unit | Team banner with / without `bannerUrl`; admin variant | image 2:1 shown / nothing; Edit button for admin | ✅ |
| TC-OB-11 | OB1–OB8 | ui | Local web: fresh browser → welcome → language → sign in; admin sets banner; volunteer Home shows it; no language button after sign-in; Me language row | flow works; axe clean | ✅ |
| TC-OB-I18N | all | unit | en/hi/pa key parity | equal | ✅ |
