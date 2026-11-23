# State dropdown, Haryana off the demo, keyboard never hides the box (REQ O1, A1, A2, V1–V3) · status: built (2026-11-23)

Owner (2026-11-23): "why haryana coming - make dropdown to pick state"; "when i click on team code, box it under keyboard and i
cant see it"; "demo_elvote_core - remove haryana data"; "update the issues i have inform you now" (= go ahead).

## Requirements
### O1 States per environment
- New server setting `STATES` (comma list, e.g. `PB,UP`). Empty = every built-in state (PB, HR, UP). Migrations add only these
  states; the demo sets `STATES=PB,UP`.
- Demo: Haryana's row is removed from `demo_elvote_core.states` (no teams, scopes or requests used it). The empty
  `demo_elvote_hr` database stays (not connected). *Check:* no demo screen lists Haryana.

### A1 State dropdown
- `Select` component: a labelled field with the chosen value and ▾; tap → bottom sheet (dialog on desktop) with ✓ on the chosen
  one. One option → just shows it, no tap. No hard-coded state fallbacks.
- Used for the state on super-admin Booths, Upload voters, Past results, Elections (new election) and Register as admin.
- *Check:* picking a state reloads the assemblies / data under it.

### A2 Remember the state
- The last state picked on the device is the default next time (if still offered); else the first state.

### V1–V3 Keyboard
- V1 Phone screens move up with the keyboard: iOS scroll screens adjust their insets and keep the focused box in view; other
  screens (Android, fixed screens) shrink above the keyboard. Bottom sheets move up too.
- V2 Done once in the shared `Screen` and `Sheet`, so sign-in, Join, Register as admin, search and forms all get it.
- V3 Dragging the screen closes the keyboard; taps on buttons still work while it is open.
- *Check:* Join → tap Team code: box and Continue are above the keyboard (iPhone + Android).

## Non-functional
- JS only (over-the-air update). a11y: Select is a button with label + value; options are rows with ✓. i18n: en/hi/pa.

## Out of scope
- Other pickers (assembly, kind, filters) stay as they are.
