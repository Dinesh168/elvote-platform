# Web desktop layout (REQ W1–W8) · status: confirmed (2026-11-19)

Owner request (2026-11-19): "mobile looks great but laptop website is not good ui/ux" · "website and android/ios app should be different - follow strict ui/ux rules and industry standards". Option chosen: **Sidebar app**.

## Decisions

| # | Decision |
|---|---|
| WD1 | Android and iOS apps keep the iOS "Clear" look unchanged. Only the **web** build gets the desktop layout |
| WD2 | Layout class from platform + window width: web ≥ 1024 px = `desktop`; web 768–1023 px = `rail`; anything else (native, or web < 768 px) = `phone` (the current layout) |
| WD3 | Desktop follows common web-app conventions (left sidebar, page header, breadcrumbs, tables, centred dialogs, hover and focus states), WCAG 2.2 AA, keyboard operable |
| WD4 | Same screens and same data hooks on every platform. Layout differences live in the kit (`src/design/`), so screens stay single-source |

## Requirements

### W1 Layout class
- **Behaviour:** `useLayout()` in `src/design/layout.ts` returns `phone | rail | desktop` and updates on window resize.
- **Acceptance:** native → `phone` at any width; web 1440 → `desktop`; web 900 → `rail`; web 390 → `phone`.

### W2 App frame (all roles)
- **Behaviour:** on `desktop`/`rail` the bottom tab bar is replaced by a left sidebar (240 px; 72 px icons-only on `rail`): ElVote mark, the role's menu with icons and an active highlight, and a footer with name, role, AC switcher (admin with more than one AC), language switch and Sign out (with confirm). Admin "More" items (Polling day, Zones, Settings) become direct sidebar items.
- **Menus:** volunteer = Home, Voters, Polling day, Tasks, Surnames, Me · admin = Dashboard, Map, Team, Tasks, Polling day, Zones, Settings · super-admin = Overview, Parties, Upload roll, Super-admins.
- **Acceptance:** at 1440 px no bottom tab bar is rendered; each sidebar item navigates and shows as current (`aria-current="page"`); browser Back returns to the previous page.

### W3 Page frame
- **Behaviour:** `Screen` on desktop: 64 px top bar with a breadcrumb (`Parent › Page`, parent is a link) instead of "‹ Back", and the trailing actions on the right; content centred, max 1200 px, 32 px side padding. Page titles 28 px (not the 32 px iOS large title). The browser tab title is `Page · ElVote`.
- **Acceptance:** at 1440 px content never exceeds 1200 px; the tab title matches the page.

### W4 Kit on desktop
- Typography: desktop scale (title 28, title2 20, headline/body 15, callout 14, footnote 13, caption 12).
- `Button`: sized to its label (not full width), 40 px high, hover darkens.
- `Row` / clickable items: hover background, pointer cursor.
- Focus: visible 2 px accent outline on keyboard focus (`:focus-visible`) for every interactive element.
- `Group`: sentence-case section title, white card with a 1 px border.
- `Sheet` → centred dialog (max 480 px), closes with Esc or the close button.
- `Toast` → bottom-right, max 420 px.
- New `Grid` (1 column on phone, N columns on desktop) and `DataTable` (sortable column headers with `aria-sort`, hover rows, row click; phone falls back to the list it replaces).

### W5 Sign-in screens
- Login, Join, Waiting, Choose role: split screen on desktop: brand panel (left, accent) with name and three short benefits; form in a centred 400 px card (right). Phone unchanged.

### W6 Admin
- Dashboard: 4 tiles in one row; charts in a 2-column grid; booth table as a sortable `DataTable` (Booth, Name, Zone, Met, Total, % met, Workers).
- Team, Tasks, Zones, Polling day, Settings: content in the desktop frame; lists of people/tasks as tables where the phone shows rows.
- AC switcher sheet → dialog.

### W7 Super-admin
- Overview: tiles in one row; states and parties side by side; parties/ACs as tables. Upload and forms max 640 px wide.

### W8 Volunteer
- Home in 2 columns (work on the left, numbers on the right). Voters list max 960 px. Other screens in the desktop frame.

## Non-functional
- No change to native rendering (phone layout code paths untouched; Jest snapshot/behaviour tests still pass).
- No new colours outside `tokens.ts`. No horizontal page scroll at 768–1920 px.
- Accessibility: axe-core scan with 0 serious/critical violations on Login, Admin dashboard, Team, Platform overview, Volunteer home.
- Keyboard: every sidebar item, button, row and table header reachable with Tab and activated with Enter/Space; Esc closes dialogs.

## Out of scope
- Dark mode on web. Map tiles (map stays the current dot map). Volunteer master–detail voters view (later, if wanted).
