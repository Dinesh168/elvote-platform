# ELVOTE – App Changes (from review call, 16 Nov 2026)

Source: screen recording `Recording 2026-11-16 213235.mp4` (64 min). The call walks through a
requirements sheet (tabs: **volunteer specific**, **admin specific**, overall) side by side with
the current app. The notes below follow that sheet, plus what was said on the call.

---

## 1. Volunteer side

### 1.1 General
- [ ] **Sidebar: remove** Forum, Party Updates, Prachar Kit, Messages.
- [ ] **Rename** "Assign Task" → **"Task"**.
- [ ] Add a **Refresh** button.
- [ ] **Volunteer name + mobile number shown on screen at all times** (blinking / persistent, "like the Saral app").

### 1.2 Login
- [ ] OTP login → **passkey on first login**: volunteer fills **name, EPIC, current booth**.
  - Booth chosen from the booth list. Open question: **allow selecting multiple booths?** (a volunteer may know several booths/buildings out of ~300).
- [ ] After admin accepts the passkey, the volunteer presses **Refresh** to get in.

### 1.3 Dashboard (home tiles) — every tile shows a **counter or % / count-of-total**
| Section | Items |
|---|---|
| Voter list | **Search voter** (highlighted; search all using EPIC, name, age details) · Serial no wise · House no wise (search bar) · Surname list (if more than one word is typed, use the **last word**) · Contacted (counter) · Not contacted (counter) |
| Group wise | Our voters · Opposition voters · Target voters |
| Mobile no | Voters with mob no · Voters without mob no · Our voters with mob no · Opposition voters with mob no · Target voters with mob no |
| House | Total houses · Our houses · Opposition houses · Target voters houses · Our houses with mob no · Opposition houses with mob no · Target voters houses with mob no |
| Age wise | First-time voters (age < 21) · Young (< 35) · Mid age (35–60) · Senior citizen (> 60) |
| Gender wise | Male · Female (counter) |

### 1.4 Voter list → click on a voter card
Checkbox should be **easy to click**, and the **response fields slide down** below it:
- [ ] Voter group
- [ ] Migrant status (**default = Resident**)
- [ ] Add mobile no
- [ ] Check same-address voters. The **Back** button must **clear that filter**.
- [ ] **Send voter slip**. Can it go over **WhatsApp**?
- [ ] Poll-day assistance (Y/N)
- [ ] Mark group: **flexible** (can be changed later)

**Voter slip (from discussion):** the slip should use the voter's **booth by default** (the booth the volunteer has open) and include
**serial no, name, relative name, age, gender, address, EPIC**. Use "send voter slip" alongside/instead of Print (Print was slow/flaky in the demo).

### 1.5 Polling day
- [ ] **Type serial no → mark as voted** (fast entry).
- [ ] **Poll-day assistance voter list**: a separate list of everyone marked "poll-day assistance = Y". Show a counter, grouped as **house no → voter names**.
- [ ] Tiles, each with % or count/total: **Voted · Not voted · Our not voted · Opposition not voted · Target voters not voted**.
- [ ] Lists **update automatically**: once a voter is marked voted, they move out of the not-voted lists.
- Current Polling Day screen (Polling %, Voted, Not Voted, Our/Opposition Not Voted, Recently Added/Deleted, Duplicate, Search by EPIC, Search by Details) is the base to extend.

### 1.6 Search voter
- [ ] Search across **EPIC, name, age details**.
- [ ] On polling day the search runs **within the booth**. Example: typing "Ram" lists every Ram in that booth, so the volunteer can find neighbours. Clicking a result should open that voter in the voter list.
- Note: in the demo, Search Voters returned "No Matching Voter to show". Needs checking.

### 1.7 Task (task list)
Outreach drives: **Women outreach · 1st-time voters outreach · Young voters outreach · Target voter outreach · Our voters outreach · Senior citizen outreach · Migrated voter outreach**.
- [ ] Follow the "AI pic" Task List design: **Targeted vs Completed** counts, status (In progress / Ongoing / Completed), filter tabs. Open question: should a **date** also be shown?

---

## 2. Admin side

### 2.1 Dashboard (layout as per the "AI pic" design)
**Counts:** Voters visited today · Total voters · Contacted (%) · Not contacted (%) · Our voters · Opposition voters · Target voters · Total houses · Houses visited · Our houses · Opposition houses · Target houses · Migrated voters

**Mobile numbers:** Our voters mob no · Opposition voters mob no · Target voter mob no · Houses with mob no · Our house mob no · Opposition house mob no · Target house mob no

**Polling stations:** PS total · Strong · Moderate · Weak · PS with worker · PS without worker

**Demographics / people:** 1st-time voters · Senior citizens · Mid-age voters · Male · Female · **Top performing workers**

**Charts option:**
- Our / Opposition / Target
- Age count
- PS strong / moderate / weak
- Houses: our / opposition / target
- **Zonal performance** (voters contacted ÷ total voters)

### 2.2 Zones (new, not in the app yet)
- [ ] **Zone-wise list Z1–Z10**, each showing the PSs it covers.
- [ ] Per zone: total PS, voters, voters contacted, houses, houses visited, our / opposition / target voters, plus a chart option.
- [ ] **Clicking a zone opens the same dashboard filtered to that zone.**
- [ ] **Zone / PS list with % completion.**
- Reasoning given: one leader can't manage a whole assembly. Split it into zones (default **10 zones**, e.g. 300 PS → 10 zones of 30) so you can see which zone is doing well or badly. Reference shown: another party app's **"Mandal detail"** table (booth, booth with worker, houses visited, voters contacted, mobile numbers) and a **Top 10 workers** table.

### 2.3 Admin sidebar / pages
| Page | Requirement |
|---|---|
| Trend analytics | Keep. Merge its data onto the **Map** |
| Polling station | Keep |
| **Map** | PS markers. Clicking a PS shows **the whole dashboard data above for that PS** |
| **Assign task** | Drive name fixed, **select date / start & end date** · **see performance** · zone/PS list with % completion |
| Volunteers list | Keep |
| **Activate volunteers** | New: approve volunteer passkey requests (see 1.2) |
| Polling day | As in the current pic. Click → **PS list with poll %** |
| Change language | Keep |

---

## 3. Open questions raised
1. Can the voter slip be sent via WhatsApp?
2. Can a volunteer select multiple booths at first login?
3. Should the task list show dates along with targeted/completed?

## 4. Reference designs in this folder
`ELVOTE Outreach Task List.png`, `Minimal Surname List App UI.png`, `Election Drives Dashboard.png`,
`ELVOTE Forum State Groups.png`, `ELVOTE Messages Screen Mockup.png`, `ELVOTE Prachar Kit Library.png`,
`EL VOTE Hindi Party Updates Feed.png`, `poll.png`

> Caveat: the call audio is low-volume Hindi/Punjabi and the automatic transcript was only partly usable.
> The spreadsheet content above was read directly from the screen and is reliable. The "from discussion" points come from the clearer transcript fragments.
