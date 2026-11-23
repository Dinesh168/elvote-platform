# Flow fixes, bottom menu, charts, clean-up, polling-day search (REQ O1–O3, P1–P2) · status: built (2026-11-23)

Owner (2026-11-23): "some places flow is breaking … fix it … user experience should be the best; the bottom menu went down,
not visible half; use proper charts"; "remove all unnecessary and junk code"; "app should be very easy to use - avoid
multiple navigations for both admin and volunteer"; "in polling day, find by epic, slno - show complete assembly not his
booth". Decisions: walk-through on the web with demo sign-ins (local copy); EPIC or booth + S.No; any team member may mark
Voted for any booth inside the voting window; old v1 client + old backend removed. Transliteration of sample data dropped
(owner will do it later); the demo keeps the data loaded on 2026-11-23.

## O1 Flow fixes found in the walk-through
| Where | Break | Fix |
|---|---|---|
| Volunteer Home | "Start meeting" was below 3 cards (scroll to start work) | Next voter + search first; numbers after |
| Tips | "Tap Meet" but the button says "Start meeting" | Tip text matches the button (en/hi/pa) |
| Poll day | Keypad cut off on small phones (7–9, 0, ✓ Voted hidden); "‹ Home" on a tab | Keypad pinned; the part above scrolls and follows the typed serial; no back link |
| Sign in | Extra tap after the 6-digit code; logo shown twice | 6th digit signs in; wordmark once |
| Admin Dashboard | Volunteer requests far down the page | In "Needs you today" when waiting |
| Admin Team | Approve needed a second screen; tab label cut | Review / Approve on each request; "Requests (n)" |
| Admin Map / Team / Tasks | No team bar (☰ menu gone) | Team bar on every admin tab |

## O2 Bottom menu
- One style for both tab bars: height + the phone's bottom inset, inset as padding (`features/shell/tabBar.ts`).
- Web page (`public/index.html`): `viewport-fit=cover`, root height `100dvh` (no menu under the browser toolbar).

## O3 Charts (react-native-gifted-charts)
- Parts of a whole → donut with total + legend (number, %); daily contacts → bar chart with axis and tap tooltip;
  Trend → vote-share bars per party (ours highlighted) and, with 2+ years, our share vs main rival over years.
- Every chart reads its numbers to screen readers; year rows stay as the table view.

## O4 Clean-up
- Removed the old v1 client (screens, components, storemanagement, services, utils, libs, hooks, web, App.js …) and the
  old Express `backend/` (git history keeps them; the live app runs from its own repo). Removed 19 unused packages.

## P1 Polling day: find any voter of the assembly
- `GET /v1/m/:mid/polling/find?epic=` or `?part=&sno=` (volunteer/admin, poll feature on). Returns name, relative, age,
  booth, S.No, voted, `own`. No group, phone or notes. "Find voter" on Poll day: EPIC | Booth + S.No, then ✓ Voted.
### P2 Marking another booth
- A change that only sets/clears `votedAt` is accepted for any booth of the assembly while the election window is open
  (`electionFor(...).inWindow`); every other change stays limited to own booths. Checked only for voters outside own booths.

## Non-functional
- Privacy: other booths' voters show no group/phone. Performance: the window check runs only for other-booth marks.
