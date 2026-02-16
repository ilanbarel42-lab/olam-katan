# Olam Katan – Project Memory Bank

Project context and changes for AI assistance. **Maintenance:** `.cursor/rules/memory-bank.mdc` instructs the AI to update this file whenever significant changes are made.

---

## Project Overview

**Olam Katan** (עולם קטן) – childcare registration and scheduling app (React + Vite, RTL). Deployed to GitHub Pages with StatiCrypt password protection. Hebrew/English hybrid UI.

---

## Data Structures

### Children
Array of `{ id, childName, dateOfBirth, registerStatus, group, parent1Name, parent1Phone, parent2Name, parent2Phone, healthNotes, nutritionNotes }`

### Employees
Array of `{ id, name, phone, status, freeDay, groupId, role, workStart, workEnd }`. Roles: `lead`, `assistant`, `cook`. Statuses: `permanent`, `temp`, `discontinued`, `filler`. `workStart`/`workEnd` stored as decimal hours (7.5 = 7:30, 17.25 = 17:15); UI allows typing (e.g. `7:30`) or dropdown quick-pick (7..17).

### Age Groups
Array of `{ id, name, minAge, maxAge, label, maxCapacity, ratio, staffingMin, staffingOptimal }`. Staffing: `{ lead, assistant, cook }`.

### Schedule
`{ [weekKey]: { assignments: { [dayKey]: { [groupId]: { employeeIds: [], externals: [{ name, role }] } } } } }`. External roles: `lead`, `assistant`, `cook`. Legacy `externalNames: string[]` is migrated to `externals` on load.

---

## Storage Layer

- **Without Supabase**: localStorage only (device-specific).
- **With Supabase**: All four keys (children, age_groups, employees, schedule) are stored in Supabase. In-memory cache populated by `loadAll()`; `getX()` reads from cache; `saveX()` writes to localStorage first, then Supabase.
- **First-time / empty cloud**: Local data is migrated to Supabase (all four keys backfilled).
- **Partial cloud**: If Supabase returns some keys but not others, missing keys are merged from localStorage and backfilled to Supabase (prevents data wipe).
- **Post-load sync**: After every load, all four keys are pushed to Supabase (`syncAllToSupabase`). Fixes asymmetry where age_groups was saved on every load (App.jsx useEffect) but employees/children/schedule only on user interaction.
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

---

## Important Files

| File | Purpose |
|------|---------|
| `src/utils/storage.js` | Storage layer (Supabase + localStorage, loadAll, get/save) |
| `src/utils/supabase.js` | Supabase client (only when env vars set) |
| `supabase/schema.sql` | DB schema for app_data |
| `src/components/ScheduleTab.jsx` | Schedule grid, externals, staffing status |
| `src/components/ChildrenTab.jsx` | Children table, filters, Expected Entry |
| `src/components/EmployeesTab.jsx` | Employees table, group stats |
| `.github/workflows/deploy.yml` | Build + StatiCrypt + Pages deploy |

---

## Configuration

- **`src/config.js`** – Central config with env overrides. `workHours` (min/max 7–17), `referenceDate` (Expected Entry calc), `defaultAgeGroups`, `defaultStaffing`. Override via `VITE_WORK_HOURS_MIN`, `VITE_WORK_HOURS_MAX`, `VITE_REFERENCE_DATE_*` (see `.env.example`).

## Conventions

- **Full Hebrew UI** – All UI text translated via `src/i18n.js`. RTL layout (`dir="rtl"`, `lang="he"`). Inputs/selects/textareas align right.
- IDs: `new-${Date.now()}` for new rows.
- Reference date for age/Expected Entry: Sept 1, 2026.
- Working week: Sunday–Friday.
