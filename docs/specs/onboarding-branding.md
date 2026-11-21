# First launch, branding and team banner (REQ OB1–OB9) · status: built (2026-11-21)

Owner (2026-11-21): "Why is branding not there on login/registration for a few pages? When a user opens the app for the first time show the splash screen, then a welcome message, then pick the language, then login/registration, and save this default language. Until the user selects a language show text in English and small Hindi. Once logged in don't show the change-language button on top of every page; if they want to change it let them go to Me, where there is already a language option, and put some branding there. Very important: when the admin puts an image, that is a banner: show it on Home when the volunteer logs in, and to the admin too. Branding should be clean and follow iOS UI/UX rules." Mockups approved: https://claude.ai/artifact/9ejYamEuznPrwstB8Jy43v (9 screens). Confirmed defaults below.

## Decisions
| # | Decision |
|---|---|
| OD1 | Welcome is **one screen with three points** (meet every voter, works without internet, ready for polling day) |
| OD2 | The banner is set by **the admin** (More → Home banner) **and the super-admin** (customer settings → Look) |
| OD3 | After sign-in the **language switch is only in Me (volunteer) / More (admin) / Overview (super-admin)**, on phones and the website; the website sidebar no longer has one |
| OD4 | Sign-in screens use **ElVote blue**; after sign-in the app uses the **party colour** (existing customer look) |

## Requirements
### OB1 First launch
- Splash: the ElVote vertical logo on white (native splash; SDK 58 plugin).
- A device that has not finished first launch opens **Welcome** (`/welcome`) before sign-in, then **Choose language** (`/language`), then **Sign in**. Finished = saved on the device (`prefs.onboarded`).
- Welcome: ElVote wordmark, "Welcome to ElVote", three points with icons, **Continue** and **Skip** (both go to Choose language).
- *Given* a new install, *when* the app opens, *then* Welcome shows; after Continue and a language, Sign in shows; the next time the app opens it goes straight to Sign in (or the app when signed in).

### OB2 English with small Hindi before a language is chosen
- Welcome and Choose language show every line in **English with Hindi underneath, smaller** (same meaning). Buttons too ("Continue" / "जारी रखें").

### OB3 Choose language
- iOS list: ਪੰਜਾਬੀ (Punjabi), हिन्दी (Hindi), English (अंग्रेज़ी), checkmark on the selected one; note "You can change it later in Me → Language". **Continue** saves it as the device language (`langChosen`) and opens Sign in in that language.

### OB4 Branding on sign-in and registration
- Every sign-in/registration screen (sign in, create account, forgot password, verify email, Your details, choose role, admin request, join team, waiting) shows the **ElVote mark and wordmark** at the top on phones; the website keeps its brand panel with the real mark.
- **No language button** on these screens.

### OB5 No language button after sign-in
- Removed from the top of volunteer Home, admin Dashboard, super-admin Overview and the website sidebar.

### OB6 Language in Me / More / Overview
- Volunteer **Me** and admin **More**: a **Language** row showing the current language; tapping opens a list with a checkmark (languages the customer allows). Super-admin Overview: the same row (all languages).

### OB7 Branding in Me / More
- A card at the top: team logo (or its first letter in the party colour), app name, party · assembly; then the person (initials, name, mobile, role). The ElVote wordmark and app version at the bottom.

### OB8 Team banner
- `party_constituencies.banner_url`; `/v1/me` memberships `look.bannerUrl`.
- Admin: More → **Home banner** (`/admin/banner`): preview, **Choose from photos** (crop to 2:1), **Take photo** (phones), **Remove banner**, **Save banner**. PNG/JPG/WebP up to 2 MB. API `POST /v1/m/:mid/banner` (multipart), `DELETE /v1/m/:mid/banner`; admin of that team only; audit logged.
- Super-admin: customer settings → Look → **Home banner** (same rules; `POST /v1/admin/customers/:id/upload?kind=banner`).
- Shown **full width, 2:1, rounded**, at the top of the **volunteer Home** and the **admin Dashboard** (with an **Edit** button for the admin). No banner → nothing shown.

### OB9 iOS look
- Large titles, grouped inset lists, 44 pt+ rows, system back link, filled primary button at the bottom, red only for destructive actions.

## Data / API changes
- Core migration `007_banner.sql`: `party_constituencies.banner_url text`.
- `POST/DELETE /v1/m/:mid/banner`; upload `kind=banner` (2 MB); customer `bannerUrl` in super-admin customer API and in `look`.
- App: `/welcome`, `/language`, `/admin/banner`; `prefs.onboarded`; `BrandHeader`, `BrandCard`, `LanguageRow`, `TeamBanner`; `expo-image-picker`.

## Non-functional
- Images served from `/files/<random>` (existing, cached, public); 2 MB limit; content-type checked by bytes.
- en/hi/pa text for every new string; screens axe-clean; touch targets ≥ 44 px.
- Offline: the banner is cached like other images; first launch works offline (no network needed before Sign in).

## Out of scope
- Several welcome pages, banner links/actions, banner per booth.
