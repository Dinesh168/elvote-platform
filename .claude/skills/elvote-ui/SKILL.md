---
name: elvote-ui
description: UI/UX rules for building or changing any ElVote screen or component (Android, iOS, Web). Use for any screen, layout, component, copy, colour, icon or navigation work. Users include low-literacy field volunteers, so the app must be extremely easy and premium. Source of truth is docs/DESIGN_SYSTEM.md.
---

# ElVote UI rules ("Sahaj" design system)

Read `docs/DESIGN_SYSTEM.md` before designing. This is the short checklist. The old UI (`theme.js`, react-native-paper screens) is being replaced and must not be extended.

## Every screen must pass

- [ ] **One job:** one obvious primary action, a full-width `Button` (56 dp) at the bottom on mobile
- [ ] **Icon + word (+ colour)** on every action and status; never an icon alone, never colour alone
- [ ] **Tap, don't type:** chips, pickers and steppers; numeric keypad for numbers
- [ ] Touch targets ≥ 48 dp (primary 56), ≥ 8 dp apart; body text 18 sp, nothing below 14 sp
- [ ] Reversible actions apply instantly + an **Undo** toast; a confirm sheet only for destructive actions
- [ ] Pressed state + haptic on tap; skeleton after 300 ms of loading; Empty and Error states with one action
- [ ] Works **offline** (reads from cache, writes queued; sync status on Me). **No persistent name/mobile strip** (owner decision)
- [ ] **Language switch on Home:** a small "ਪੰ / A" pill in the Home header (active script bright), always reachable without reading; also on Me and the first-launch screen
- [ ] All copy in i18n: **English + one regional language** (set per state/party, e.g. Punjabi or Hindi), ≤ 3-word verb buttons, plain words (*Booth*, *House*, *Supporter*)
- [ ] Group always shown as **colour + word** (never colour alone): Our = green #166534, Target = amber #B45309, Opposition = red #DC2626, Not met = grey pill
- [ ] Accessible: AA contrast, `accessibilityRole` + `accessibilityLabel`, OK at 130% font scale, Reduce Motion respected
- [ ] **Mobile only** (volunteer and admin): phone layouts with bottom tabs; on tablet / web the same phone layout is centred (max 480 px)
- [ ] **One booth at a time** for volunteers: booth switcher on Home and Voters; every number on screen belongs to the selected booth
- [ ] ≤ 3 taps from Home to any voter action. **Clarity beats fewer taps:** an extra tap is fine if it keeps a screen simple; never pack a screen with numbers (owner feedback)
- [ ] **Back:** every screen except the two roots (volunteer Home, admin Dashboard) has the shared `TopBar` with a "‹ Back" button top-left; Back also clears temporary filters (e.g. same-address) before leaving
- [ ] **iOS-style "Clear" look on every platform** (owner 2026-11-18): grouped `#F2F2F7` background, white inset groups, large titles, blue ‹ Back, sheets with Done, translucent tab bar, Inter + Noto Sans Gurmukhi. No coloured headers, gradients or heavy shadows. See DESIGN_SYSTEM.md §3
- [ ] **Minimal inside cards:** voter cards and their actions stay plain (text buttons, thin 2 px status border, no heavy tints). Icon tiles are allowed on Home navigation tiles only (owner preference)
- [ ] **Group choice** = three readable buttons in one row (60 px, 17 px bold word, coloured 2 px border + light tint in the group colour); the selected one fills solid with white text and a ✓. Readable at arm's length outdoors
- [ ] **Active state always obvious:** every toggle / choice shows the active option filled (indigo or group colour) with white text and a ✓; inactive = white with grey border. Never white-on-grey for "selected"

## How to build

- Use only kit components from `src/design/components/` (`Screen`, `Button`, `VoterCard`, `OpinionPicker`, `Chip`, `StatTile`, `Sheet`, `Toast`…). If something is missing, add it to the kit (with a gallery entry and test), not inline in a screen.
- Use only tokens from `src/design/tokens.ts` for colours, spacing, radius, type and motion. No hex values or magic numbers in screens.
- Routes live in `src/app/` (Expo Router) with stable English ids. Titles come from i18n.
- Same design on all three platforms, adapted by breakpoint, never forked.
- Add or update the screen's entry in the component gallery and in `docs/FEATURES.md`.

## Verify

Screenshots on Web (phone width + desktop width) and Android, in English **and** Hindi or Punjabi, at normal and 130% font size.
