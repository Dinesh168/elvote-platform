# Back goes where you came from (REQ B1–B3) · status: built (2026-11-24)
Owner: "navigation should happen properly, back needs to go back from where it came from".
- B1 History of visited screens with their tab (`src/features/shell/navHistory.ts`, tracked in the root layout).
- B2 Back link: same tab → router.back(); other tab (e.g. Map → booth page) → close the booth page and return to Map; label "Back".
- B3 Android hardware Back follows the same rule; on the first screen Android closes the app. Tabs use backBehavior "history".
- Tests: src/features/shell/navHistory.test.ts (TC-NB-1..3).
