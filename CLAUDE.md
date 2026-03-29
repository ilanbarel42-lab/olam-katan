# Olam Katan – Claude Project Context

Project context for coding assistance. Keep this file in sync with project changes.

---

## Quick Start

- **Run dev**: `npm run dev` → http://localhost:3000
- **Build**: `npm run build`
- **Preview prod**: `npm run preview`
- **Config**: `.env.example`; Supabase/Advisor optional

---

## Memory Bank Rule

Update `MEMORY.md` whenever you make **significant** changes.

**Significant:** New features/tabs, data structure changes, storage/backend changes, new important files, convention/config changes, bug fixes that clarify documented behavior.

**Not significant:** Minor UI tweaks, typo fixes, refactors that preserve behavior, dependency bumps.

**How:** Read MEMORY.md → add/revise relevant section → keep entries concise → update in same session.

---

## Project Overview

**Olam Katan** (עולם קטן) – childcare registration and scheduling app (React + Vite, RTL). Deployed to GitHub Pages with StatiCrypt password protection. Hebrew/English hybrid UI.

---

## Data Structures

### Children
Array of `{ id, childName, dateOfBirth, entryDate, registerStatus, group, nextGroup, parent1Name, parent1Phone, parent2Name, parent2Phone, healthNotes, nutritionNotes }`. **Group** and **nextGroup** are calculated (editable): group from age at `entryDate` (today if empty), nextGroup from age on Sept 1st. When age fits no group, UI shows "קטן מדי" or "גדול מדי".

### Employees
Array of `{ id, name, phone, status, freeDay, groupId, role, workStart, workEnd }`. Roles: `lead`, `assistant` (cook removed). Statuses: `permanent`, `temp`, `discontinued`, `filler`. `workStart`/`workEnd` stored as decimal hours (7.5 = 7:30, 17.25 = 17:15); UI allows typing (e.g. `7:30`) or dropdown quick-pick (7..17).

### Age Groups
Array of `{ id, name, minAge, maxAge, label, maxCapacity, ratio, staffingMin, staffingOptimal }`. Staffing: `{ lead, assistant, cook: 0 }` (cook always 0; UI shows only מובילה/סייעת).

### Schedule
`{ [weekKey]: { assignments: { [dayKey]: { [groupId]: { employeeIds: [], externals: [{ name, role }] } } } } }`. External roles: `lead`, `assistant` (cook removed). Legacy `externalNames: string[]` is migrated to `externals` on load.

### Events
Array of `{ id, type, date, entityType, entityId, description, resolved?, createdAt, source }`. Types: `daily_summary`, `child_incident`, `staff_event`, `staff_gift`, `parent_promise`, `general`. Stored in localStorage (`olam-katan-events`) and Supabase key `events`.

---

## Storage Layer

- **Without Supabase**: localStorage only (device-specific).
- **With Supabase**: Keys `children`, `age_groups`, `employees`, `schedule`, `events` are stored in Supabase. In-memory cache populated by `loadAll()`; `getX()` reads from cache; `saveX()` writes to localStorage first, then Supabase.
- **First-time / empty cloud**: Local data is migrated to Supabase (all four keys backfilled).
- **Partial cloud**: If Supabase returns some keys but not others, missing keys are merged from localStorage and backfilled to Supabase (prevents data wipe).
- **Post-load sync**: After every load, all keys (children, age_groups, employees, schedule, events) are pushed to Supabase (`syncAllToSupabase`).
- **Retry**: `saveToSupabase` retries up to 3 times with backoff on failure.
- **Schema**: `supabase/schema.sql` – single `app_data (key, value jsonb)` table.

---

## Key Features Implemented

1. **Schedule Tab – externals with roles**  
   Externals stored as `{ name, role }`. Role selector on each badge. `getStaffingStatus` counts externals by role for allocation checks (✓/!/red badges).

2. **Schedule Tab – auto-prepopulation**  
   Schedule auto-populates when opening the tab or changing weeks. No "Generate Week" button.

3. **Employees/Children – unified add UX**  
   Single "+" button in table header for adding rows.

4. **Children Tab – Expected Entry column**  
   Shows when child reaches minimum age for their group (reference date: Sept 1, 2026). Anomaly flag if age is outside group range.

5. **Children Tab – AgeGroupWidget**  
   Collapsed by default; compact filter layout.

6. **Sticky header**  
   Brand + tabs in one row; `app-header-sticky` wrapper.

7. **Schedule visual separation**  
   `.schedule-grid`, `.schedule-cell`, `.schedule-group-row`; 2px cell borders; 3px between groups; group labels with colored left borders.

8. **Supabase backend (optional)**  
   Cross-device sync via Supabase. See `.env.example` and README. Deploy needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repo secrets.

9. **Employees Tab – Entry/Exit working hours**  
   Columns "Entry" and "Exit". Times stored as decimal hours (7.5 = 7:30). Text input for manual entry (e.g. `7:30`) plus dropdown for quick whole-hour selection (7–17). Parses `H:MM`, `HH:MM`, or decimal.

10. **Hebrew: עוזרת → סייעת**  
    Assistant label is סייעת throughout. Settings use full names (מובילה, סייעת, תכולה מקסימלית) instead of abbreviations.

11. **Cook removed**  
    Cook (טבחית) removed from employee roles, external roles, and minimum allocation UI. Staffing still has `cook: 0` for compat.

12. **Children Tab – calculated Group & Next Group**  
    Group from age at entry date; nextGroup from age on Sept 1st. Both editable. Entry date field is editable. Shows "קטן מדי"/"גדול מדי" when age fits no group.

13. **צוות tab removed**  
    Team tab removed from navigation.

14. **Advisor Tab (יועץ)**  
    - **ייעוץ יומי**: Rule-based advice (parent promises, staff gifts, child incidents, Sept 1, upcoming events). Configurable advice window (7/14/21/30 days). Trigger button "קבל עדכון יועץ".  
    - **שאל את היועץ**: Prompt input for AI questions (requires API – see ADVISOR_V2_DESIGN.md).  
    - Daily summary, quick-add events, events history by date with filter by child/employee.  
    - Configurable reminders: Settings → "תזכורות יועץ" (days Sun–Thu, time, advice window). In-app banner when in reminder window.

15. **Advisor config**  
    Stored in `olam-katan-advisor-config`: `{ enabled, days, hour, minute, adviceWindowDays }`. Default: Sun–Thu 17:00 IST, 14 days.

---

## Important Files

| File | Purpose |
|------|---------|
| `src/utils/storage.js` | Storage layer (Supabase + localStorage, loadAll, get/save, events, advisor config) |
| `src/utils/supabase.js` | Supabase client (only when env vars set) |
| `src/utils/adviceEngine.js` | Rule-based advisor logic (2-week scope, parent promises, gifts, etc.) |
| `supabase/schema.sql` | DB schema for app_data |
| `src/components/ScheduleTab.jsx` | Schedule grid, externals, staffing status |
| `src/components/ChildrenTab.jsx` | Children table, filters, Group/Next Group/Entry date |
| `src/components/EmployeesTab.jsx` | Employees table, group stats |
| `src/components/AdvisorTab.jsx` | Daily advise, ask advisor, events, daily summary |
| `src/components/SettingsTab.jsx` | Age groups, advisor reminders config |
| `.github/workflows/deploy.yml` | Build + StatiCrypt + Pages deploy |
| `ADVISOR_V2_DESIGN.md` | Plan for free-style recording + LLM Q&A |

---

## Configuration

- **`src/config.js`** – Central config with env overrides. `workHours` (min/max 7–17), `referenceDate` (Expected Entry calc), `defaultAgeGroups`, `defaultStaffing`. Override via `VITE_WORK_HOURS_MIN`, `VITE_WORK_HOURS_MAX`, `VITE_REFERENCE_DATE_*` (see `.env.example`).

## Conventions

- **Full Hebrew UI** – All UI text translated via `src/i18n.js`. RTL layout (`dir="rtl"`, `lang="he"`). Inputs/selects/textareas align right.
- IDs: `new-${Date.now()}` for new rows; events: `ev-${Date.now()}`.
- Group calc: age at entry date (or today if empty). Next group: age on Sept 1st.
- Working week: Sunday–Friday. Advisor reminders default: Sun–Thu 17:00 IST.
- Tabs: children, employees, schedule, advisor, settings (צוות removed).
