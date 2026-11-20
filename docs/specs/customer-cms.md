# Customer settings (CMS), user control, vote trace (REQ C1–C9) · status: confirmed (2026-11-19)

Owner (2026-11-19): "super admin can set how app needs to look for admin and his volunteer, not admin — super admin are we, selling this to different parties of different assembly leaders" · "keep all maximum feature that super admin can control like cms — super admin mostly uses website" · "if i want any user not to use, i can do that" · "no need audit logs of any user … i want trace of changes on votes … but i don't want what user has done every minute" · "i want proper political app".

## Decisions

| # | Decision |
|---|---|
| CD1 | A **customer** = one party in one assembly (`party_constituencies` row). Everything here is set per customer by the super-admin (us) |
| CD2 | Admins can no longer change branding. The Branding page is removed from the admin app; `PATCH /v1/m/:mid/settings` is removed |
| CD3 | Super-admin controls: look, candidate, features (plans), languages, limits + subscription, messages, live preview; plus user control and vote trace |
| CD4 | No history/audit screens anywhere. `audit_log` stays as a hidden server record of management actions only. No activity, screen-view or "last active" tracking. No table is removed |
| CD5 | Vote trace (who changed a voter, when, what) is visible to the super-admin (all parties) and to that party's admin (own party, own AC) |
| CD6 | Features that are off are hidden in the app **and** refused by the server (`403 feature_off`) |
| CD7 | A customer that is paused/closed or past `valid_until` is refused by the server (`403 subscription_ended`); the app shows a "subscription ended" page |
| CD8 | A blocked user is refused by the server on every request within 60 s (cached status check) and all sessions are revoked at once |
| CD9 | The look applies after sign-in (before sign-in we don't know the customer). A per-customer sign-in link is out of scope |

## Requirements

### C1 Look
App name (≤ 30), logo (PNG/JPG/WebP ≤ 1 MB), party colour `#RRGGBB` (swatches, a colour picker on the web, or typed hex). The app derives its accent palette from the colour; a colour with < 5.2:1 contrast on white is darkened until it passes (same hue; 5.2 instead of 4.5 so accent text also stays ≥ 4.5:1 on the light accent tints). Applied to buttons, links, tabs, sidebar, charts' own-series colour, slip header, Home candidate banner.

### C2 Candidate
Candidate name, photo (≤ 1 MB), ballot number (1–99), slogan (≤ 80). Home shows a candidate banner (photo, name, party, ballot no, slogan). The slip shows them too.

### C3 Features (plan)
Keys: `map`, `poll`, `zones`, `tasks`, `slip`, `surnames`, `help`, `boothGps`. Presets: **Basic** = tasks, surnames; **Pro** = Basic + map, zones, slip, help, boothGps; **All** = every key. Server checks: map → `map`; polling day (admin and volunteer endpoints) → `poll`; zones → `zones`; drives/tasks → `tasks`; branding (slip) → `slip`; booth location → `boothGps`. `surnames`/`help` are app-only (computed on the phone) and hidden in the app.

### C4 Languages
Default language (`en`/`pa`/`hi`) applied the first time a member opens that customer (unless they already chose one); the list of languages the team may switch to.

### C5 Limits and subscription
`max_zones` (exists), `max_volunteers`, `max_admins` (null = unlimited), status (active/paused/closed, exists), `valid_until` date (null = no end). Approving a volunteer over the limit → `409 limit_volunteers`; adding an admin over the limit → `409 limit_admins`.

### C6 Messages
`candidate_message` (≤ 300) shown on volunteers' Home; `slip_share_text` (≤ 300) template for the WhatsApp text with `{name}`, `{sno}`, `{booth}`, `{date}`.

### C7 Preview and copy
Super-admin page shows a live phone preview (desktop: beside the form). "Copy settings from…" copies C1–C6 (not limits/status) from another customer.

### C8 Users
`GET /v1/admin/users` lists everyone (newest first, 50 per page, `offset`), with optional `q` (mobile or name, ≥ 3 chars), `role` (admin/volunteer/super), `status` (active/blocked) and `customer` filters → `{ items, total }`; the Users page opens on the full list with filters and "Load more". Actions (each needs a reason, 3–200 chars): block / unblock (`users.status`), sign out everywhere, remove from a customer (`membership.status = removed`), change role (admin ⇄ volunteer), change booths. Guards: can't block yourself; can't block or demote the last super-admin.

### C9 Vote trace
`GET /v1/m/:mid/trace?epic=` or `?booth=&sno=` (admin, own party/AC) and `GET /v1/admin/trace?state=&ac=&epic=` (super-admin, all parties): the voter + list of `contact_events` (time, who, party, what) newest first, max 200. Mobile numbers are never shown (history stores only "mobile added").

## App
- Super-admin web: Customers list → **Customer page** with sections Look · Candidate · Features · Language · Limits · Messages and the preview; **Users** page; **Vote trace** page. Sidebar: Overview, Customers, Users, Vote trace, Upload roll, Super-admins.
- Admin: Branding removed; **Vote trace** page added (sidebar on web, More on phone). Features that are off are hidden.
- Volunteer/admin: look applied after sign-in; Home candidate banner + message; slip uses photo/slogan/share text; hidden features; "Subscription ended" page.

## Non-functional
Uploads stored under `backend-v2/uploads/` (gitignored), served read-only at `/files/<random name>`; only images by magic bytes; ≤ 1 MB. Later: object storage (Spaces/S3). All SQL parameterised; zod on every body; super-admin only for C1–C9 admin endpoints.
