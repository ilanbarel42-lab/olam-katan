# Advisor Tab – Activation & Data Storage

## How to Activate

### 1. Manual (current implementation)
- Open the **יועץ** (Advisor) tab in the app navigation
- The tab is always available; open it whenever you want to record or view events

### 2. Push reminder (future)
- A backend job could send a push notification at end of day (e.g. 18:00)
- Tapping the notification would open the app to the Advisor tab
- Requires: Firebase Cloud Messaging (or similar), a backend with cron/scheduler

---

## Where Data Is Stored

### Storage backend
- **localStorage** (default): key `olam-katan-events`
- **Supabase** (when configured): key `events` in the `app_data` table
- Data syncs with your existing children, employees, and schedule storage

### Data structure (each event)
```js
{
  id: "ev-1234567890",
  type: "daily_summary" | "child_incident" | "staff_event" | "staff_gift" | "parent_promise" | "general",
  date: "DD/MM/YYYY",
  entityType: "child" | "employee" | null,
  entityId: "child-id or employee-id" | null,
  description: "free text",
  resolved: false,  // for parent_promise
  createdAt: "ISO date string",
  source: "manual"
}
```

---

## UI – Where to Find Data

### 1. Events history (by date)
- **Location**: Advisor tab → **היסטוריית אירועים**
- **Display**: Events grouped by date, most recent first
- **Actions**: Delete individual events (× button)
- **Filter**: Use the dropdown to show events for a specific child or employee (history per child / per employee)

### 2. Reminders & advice
- **Location**: Advisor tab → **תזכורות והמלצות**
- **Display**: Rule-based suggestions (parent promises, crew gifts, child follow-ups, upcoming Sept 1)
- **Updates**: Refreshes when you add or change events

### 3. Daily summary input
- **Location**: Advisor tab → **סיכום יומי**
- **Storage**: One summary per date (editing overwrites the same day)
- **Use**: Free-text description of the day; optional base for structured events

### 4. Quick add event
- **Location**: Advisor tab → **הוספת אירוע מהירה**
- **Use**: Add a single event (child incident, staff gift, parent promise) with type and linked child/employee

---

## Advice engine logic (v1)

| Advice type | Condition | Example |
|-------------|-----------|---------|
| Parent promise | Unresolved `parent_promise` events | "הבטחה להורה – יוסי" |
| Staff gift | Last gift > 6 months ago for an employee | "מתנה/גמול – שרה" |
| Child incident | Incident in last 7 days | "מעקב אחר אירוע – דני" |
| Sept 1 transition | Within 30 days of Sept 1 | "מעבר 1 בספטמבר" |
| Daily summary | Summary contains "הבטחתי" etc. | "סיכום יומי – בדיקה" |

---

## Per-child / per-employee history

- **Current**: In the Advisor tab → Events history, use the dropdown to filter by child or employee
- This shows all events linked to that child/employee, grouped by date
