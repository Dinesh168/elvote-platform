# ElVote Design System ("Sahaj")

*Sahaj* (सहज) means "easy, natural". It is the single source of truth for how the new ElVote app looks, reads and behaves on Android, iOS and Web. **The old UI (`theme.js`, react-native-paper screens) is being replaced.** Don't extend it; build new screens with this system.

## 1. Who we design for

| Persona | Reality | Design consequence |
|---|---|---|
| **Field volunteer** (karyakarta) | Low or no literacy in English, sometimes limited literacy in Hindi or Marathi. Cheap Android phone (5–6", 2–3 GB RAM), patchy 3G or 4G, used outdoors in sunlight, often one-handed while talking to voters | Icons **and** words on every action, very large touch targets, high contrast, local language by default, works offline, few screens, no typing where a tap will do |
| **Booth / party admin** | Literate, busy, on phone **and** laptop | Clear dashboards, drill-down by tapping numbers, fast search, web layout that uses the screen width |
| **Super-admin** (us) | Technical | Setup tools on web only, can be dense |

**The test for every screen:** *could a first-time volunteer who can't read English complete the main task within 10 seconds, without help?*

## 2. UX principles (non-negotiable)

1. **One screen, one job.** Each screen has a single obvious primary action, shown as a big full-width button at the bottom, within thumb reach.
2. **Picture + word, always.** Every action and status uses icon + label (+ colour). Never an icon alone, never colour alone.
3. **Tap, don't type.** Use choices, chips, steppers and pickers. Typing is only for names and numbers, and those inputs get a numeric keypad, voice search (later) or a search-as-you-type list.
4. **Big and forgiving.** Primary touch targets are ≥ 56 dp and none are smaller than 48 dp, with ≥ 8 dp between targets. Body text is 18 sp and never below 14 sp.
5. **Undo instead of "Are you sure?"** Reversible actions (mark met, set opinion) apply instantly and show an *Undo* toast for 5 s. Only destructive or irreversible actions (delete data, logout) get a confirm sheet, and that sheet uses a red, explicitly labelled button.
6. **Feedback within 100 ms.** Pressed state + haptic tick on every tap. Success shows a check animation plus a success haptic. Never leave a frozen screen: show a skeleton or spinner after 300 ms.
7. **Shallow navigation.** At most 3 taps from Home to any voter action. Bottom tabs on mobile, no hidden drawer for main features. Back always works.
8. **Speak their language.** The app has exactly **two languages: English + one regional language** (configured per state/party, e.g. Punjabi in Punjab, Hindi in UP). Picked on first launch with two big script tiles. All copy uses short, plain words (≤ 5 words per button). Numbers use the local digit style only if the user asks.
9. **Offline is normal.** Canvassing actions queue locally and sync automatically. A small sync pill shows *Saved on phone (3)* → *Synced ✓*. Never block work because the network is down.
10. **Progress motivates.** Show the volunteer's daily progress (rings or bars, "42 of 120 houses") and celebrate milestones subtly.
11. **Accessible by default.** WCAG 2.2 AA contrast (4.5:1 text, 3:1 large text and icons). Every touchable has `accessibilityRole` + `accessibilityLabel` in the user's language. Layouts still work at 130% system font scale.

## 3. Tokens (`src/design/tokens.ts`)

### Visual style: "Clear" (iOS-style, approved 2026-11-18)

The owner asked for a **clean UI like iOS apps**. We follow Apple's Human Interface Guidelines on **all three platforms** (Android and Web too), with one indigo accent. It replaces the earlier "Indigo Night" dark-header look. Approved prototype: https://claude.ai/artifact/SKB3uArAMV7gMthwuCSipR (boards 2.1 Home, 2.3 Voters, 3.1 Polling day).

**Patterns**
- **Navigation bar:** transparent on the grouped background. Root screens use a **large title** (32/40 bold) that collapses to an inline 17 pt semibold title on scroll. Non-root screens show a blue **‹ Back** (or the previous screen's name) top-left. Tool screens (Polling day) use the inline title only.
- **Inset grouped lists:** white groups (radius 12, no shadow) on `#F2F2F7`, 16 pt side margins, rows ≥ 52 pt tall with hairline dividers inset from the leading edge, › chevrons for drill-down, section headers in 13 pt uppercase grey, footnotes in 13 pt grey.
- **Settings-style icon squares** (30 pt, radius 7, white glyph) lead navigation rows: green mobile, orange houses, blue age, purple gender, indigo booth.
- **Search field:** filled grey (`fill`), radius 10, 44 pt tall.
- **Segmented control:** grey track. For view switches (House-wise | Serial no.) the selected segment is white with a light shadow. For **answers** (Yes / Moved, No / Yes) the selected segment is **filled indigo with white text and a ✓** (owner rule: the active option must be obvious).
- **Group buttons** (Our / Target / Opposition): 56 pt, 17 pt bold word, 2 pt border in the group colour plus a light tint. The selected one is solid with white text and a ✓.
- **Buttons:** filled (indigo, radius 12, 50 pt) for the one primary action. **Tinted** (indigo text on 10% indigo) for secondary actions. Plain blue text for links and Done.
- **Sheets:** grabber, centred 17 pt title, **Done** at the top right, grouped list with an indigo ✓ on the selected row.
- **Toast:** dark translucent capsule floating above the tab bar, green ✓, **Undo** on the right.
- **Tab bar:** translucent white with blur, hairline top border, 28 pt icons (outline; tinted fill when active), 12 pt labels; active = indigo.
- **Number entry (polling day):** iOS number-pad look: white keys on `#D1D4DB`, a darker delete key, a green **✓ Voted** key.
- **No** gradients, heavy shadows, coloured headers or decorative tiles.

### Colour tokens

| Token | Value | Use |
|---|---|---|
| `bg` | `#F2F2F7` | Grouped background (all screens) |
| `surface` | `#FFFFFF` | Groups, sheet rows, keys |
| `text` | `#000000` | Primary text |
| `textSecondary` | `#6C6C70` | Secondary text, section headers, footnotes (≥ 4.5:1; the lighter iOS grey is **not** used, for outdoor readability) |
| `textTertiary` | `#8E8E93` | Placeholders only |
| `separator` | `rgba(60,60,67,.18)` | Hairline dividers (0.5 pt) |
| `fill` | `rgba(118,118,128,.12)` | Search field, segmented track, neutral pills |
| `chevron` | `#C4C4C7` | Disclosure chevrons |
| `accent` | `#4F46E5` | The ONE accent: primary button, links, Back, active tab, selected answer segment, checkmarks |
| `accentTint` | `rgba(79,70,229,.10)` | Tinted buttons |
| `success` | `#1B7F3B` (text) / `#34C759` (fill) | Synced, voted |
| `danger` | `#D70015` (text) / `#FF3B30` (fill) | Live badge, errors |
| `keypadBg` | `#D1D4DB` | Number-pad background |

**Party branding (white-label):** only `accent` and `accentTint` may be overridden per party account (validated for AA contrast). Group colours are fixed.

**Group colours (fixed, always colour + word, never colour alone):**

| Group | DB code | Strong (text, dot, selected fill) | Tint (unselected button) | Label (English / Punjabi) |
|---|---|---|---|---|
| Our | `P` | `#1B7F3B` | `#F0FAF2` | Our / ਸਾਡੇ |
| Target | `U` | `#B45309` | `#FFF8EB` | Target / ਟੀਚਾ |
| Opposition | `N` | `#D70015` | `#FFF0F1` | Opposition / ਵਿਰੋਧੀ |
| Not met | `O` / null | `#8E8E93` text, `#C7C7CC` dot | none | Not met / ਨਹੀਂ ਮਿਲੇ |

### Typography

- **Inter** (the closest open font to Apple's San Francisco) for Latin script and numbers, with `tabular-nums` for counts. **Noto Sans Gurmukhi** for Punjabi, and the matching Noto family for any other regional script. Load via `@expo-google-fonts`; the system font is the fallback.
- Indic scripts need extra line height. Use the `lineHeight` values below, never tighter.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `largeTitle` | 32 / 40 | 700 | Root-screen titles |
| `title2` | 22 / 28 | 700 | Voter name on Polling day, big numbers |
| `headline` | 17 / 22 | 600 | Row titles, voter names, inline nav title, buttons |
| `body` | 17 / 22 | 400 | Default text (never below 15 for content) |
| `callout` | 15 / 20 | 400 | Secondary lines (relative · age, address) |
| `footnote` | 13 / 18 | 400 | Section headers (uppercase), footnotes |
| `caption` | 12 / 16 | 500 | Tab labels, tiny counters only |

### Space, shape, motion

- Spacing: 4-pt grid → `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32`. Group side margin 16; section spacing 20–22.
- Radius: `sm 7` (icon squares, segments) · `md 10` (search, tinted buttons) · `lg 12` (groups, primary buttons, group buttons, sheet top) · `full` (pills, avatars).
- Depth: none on groups. Only the segmented thumb, toasts and sheets have a soft shadow.
- Touch targets: ≥ 44 pt everywhere (iOS minimum); primary actions 50–56 pt.
- Motion: iOS-like. Pressed rows highlight grey (`#E5E5EA`), 120 ms. Sheets slide up with a spring. The large title collapses on scroll. Respect *Reduce Motion*. Use `expo-haptics`: `selection` on segment change, `success` on save and on ✓ Voted, `warning` on "Already voted".
- Icons: SF-Symbols-like line icons (Ionicons outline) at 22–28 pt; filled or tinted variants when active.

### Breakpoints

`phone < 600 ≤ tablet < 1024 ≤ desktop`. Phone: bottom tabs, single column. Tablet: tabs + 2 columns. Desktop (web admin): left sidebar (240 px), content max 1280 px, data tables instead of card lists.

**Web platform rules (owner, 2026-11-19: "website and android/ios app should be different").** Native apps always use the phone layout above. The website uses `useLayout()` (`src/design/layout.ts`): ≥ 1024 px `desktop`, 768–1023 `rail`, < 768 `phone`. On desktop: sidebar 240 px (rail 72 px) with real links (`aria-current`), 64 px top bar with breadcrumb instead of "‹ Back", content max 1200 px (`width="medium"` 960 for lists, `"narrow"` 720 for forms), `typeWeb` scale (title 28, body 15), buttons sized to their label (`block` for sign-in forms), bordered cards, hover backgrounds, 2 px `:focus-visible` outline, centred dialogs instead of sheets (Esc closes), toasts bottom-right, sortable `DataTable` with `aria-sort`, `Grid`/`TileRow` for multi-column layouts, browser-tab title `Page · ElVote`. Screens stay single-source: layout differences live in the kit. Target: WCAG 2.2 AA (axe: 0 serious/critical).

## 4. Component kit (`src/design/components/`)

Screens are built **only** from these, so a style change in one place updates the whole app.

| Component | Notes |
|---|---|
| `Screen` | Safe area, background, optional sticky bottom action bar, offline banner slot |
| `NavBar` | iOS navigation bar: large title (root) collapsing to inline, blue ‹ Back, one optional trailing action |
| `Button` | `primary` / `secondary` / `ghost` / `danger`; sizes `lg 56` (default) and `md 48`; icon + label; loading and disabled states; full-width on phone |
| `IconAction` | Icon + label stacked tile (Call, WhatsApp, Print). Min 72×72 |
| `Group` / `Row` | Inset grouped list and its rows: leading icon square or dot, title, value, chevron, hairline inset divider |
| `SegmentedControl` | `view` variant (white thumb) and `answer` variant (indigo fill + ✓) |
| `Card` / `ListRow` | Pressable, chevron, leading avatar or icon |
| `VoterCard` | Name (heading), house no + S.No, age + gender icons, opinion badge, met tick, one-tap quick actions |
| `GroupPicker` | Three readable buttons (Our / Target / Opposition), one tap = saved + next voter + Undo toast |
| `Chip` / `ChipGroup` | Filters, single or multi select; selected = `brandSoft` + check |
| `SearchBar` | Large, with clear button; searches name / EPIC / house as you type |
| `NumberPad` | For mobile number entry, with validation feedback |
| `StatTile` / `ProgressRing` | Dashboard numbers; tappable to drill down |
| `Sheet` | Bottom sheet for pickers and confirmations |
| `Toast` | Undo, success, error; above the tab bar |
| `EmptyState` / `ErrorState` / `Skeleton` | Illustrated, with one action (Retry) |
| `SyncPill` | Offline queue status |
| `LanguageTile` | Script-first language choice |

## 5. Content rules

- Buttons are verbs, ≤ 3 words: *Mark met*, *Call*, *Save*. Never *Submit* or *OK*.
- No jargon: use *Booth*, not "Polling Station Part"; *House*, not "Address"; *Supporter*, not "Positive opinion".
- Show numbers big and words small: **42** houses done.
- Errors say what to do: *No internet. Saved on phone, will send later.*
- Every string goes through i18n: English + the regional language(s) we ship (Punjabi, Hindi …). Hindi and Marathi copy is reviewed by a native speaker before release.

## 6. Do / Don't

| Do | Don't |
|---|---|
| Put the primary action at the bottom, full width | Hide actions in ⋮ menus or long-press |
| Pair icon + text + colour | Use colour as the only signal (the opinion dot alone) |
| Apply instantly + offer Undo | Stack "Are you sure?" dialogs |
| Show a skeleton while loading | Show a blank screen or an endless spinner |
| Use bottom tabs (≤ 5) | Use a drawer for core features |
| Keep the same layout on all three platforms, adapted by breakpoint | Fork the design per platform |
