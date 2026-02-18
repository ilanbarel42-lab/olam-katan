# Advisor V2 – Free-Style Recording + LLM-Powered Analysis

## Vision (to implement when resuming)

### 1. Recording Agent – Free-Style Input

**Goal**: Accept any voice or text input and record it in a way that supports later LLM analysis.

**What it must understand**:
- **Entire staff** – e.g. "I gave gifts to everyone today"
- **Entire parents** – e.g. "I need to call all parents about the trip"
- **Specific employee** – e.g. "Sarah got a raise"
- **Specific child** – e.g. "Dani fell in the yard"
- **General comments** – e.g. "The roof was leaking again"

**Recording approach**:
- Store both **raw transcript** (exact input) and **structured extraction** (entities, types, relationships)
- Use LLM to parse input → extract: `scope` (staff|parents|employee|child|general), `entityIds`, `eventType`, `summary`, `keywords`
- Schema that interplays with advisor:
  ```js
  {
    id, createdAt,
    raw: "הבטחתי לאם של יוסי להתקשר",           // original text
    summary: "הבטחה להתקשר לאם יוסי",           // short summary (LLM-generated)
    scope: "child",                             // staff|parents|employee|child|general
    entityType: "child",
    entityId: "child-123",
    metadata: { parentRef: "אם", promisedAction: "התקשרות" },
    embedding?: [...],                          // optional: for semantic search
  }
  ```

### 2. Advisor Agent – LLM-Powered Q&A & Conclusions

**Goal**: Use LLM to analyze stored events and answer questions.

**Capabilities**:
- **Q&A**: "When was the last time I gave this employee a gift?" → query events, summarize
- **Conclusions**: "אין מתנות לצוות כבר 4 חודשים" (no staff gifts in 4 months)
- **Reminders**: "You promised Joe's mother to call – 2 weeks ago"
- **Patterns**: "דני נפל 3 פעמים החודש" (Dani fell 3 times this month)

**Technical approach**:
- Backend API route that receives: `{ query: string, context: { children, employees, events } }`
- Send to LLM (OpenAI/Claude) with system prompt:
  - "You are an advisor for a kindergarten. Here is the event history. Answer the user's question in Hebrew."
- Return structured or free-form answer

### 3. Interplay Between Agents

| Recording stores | Advisor uses |
|------------------|-------------|
| `raw` + `summary` + `scope` + `entityId` | Full context for LLM |
| Keywords, metadata | Filtering before sending to LLM |
| Consistent entity IDs (child.id, emp.id) | Join with children/employees for names |

**Recording agent responsibilities**:
- Parse free text → extract entities (match names to children/employees)
- Assign scope and type
- Store in a format that can be sent to the advisor as context

**Advisor agent responsibilities**:
- Receive question + events (and optionally children, employees)
- Use LLM to answer
- Optionally: generate proactive reminders/suggestions

### 4. Implementation Outline (for when resuming)

1. **Data model**
   - Extend events with: `raw`, `summary`, `scope`, `metadata`
   - Keep backward compatibility with existing events

2. **Recording flow**
   - User inputs text/voice → STT if voice
   - Call LLM or simple parser to extract structured data
   - Save event with raw + structured fields

3. **Advisor flow**
   - Add "Ask a question" input in Advisor tab
   - On submit: POST to backend with `{ query, events, children, employees }`
   - Backend calls LLM, returns answer
   - Display answer in UI

4. **Backend**
   - Need serverless function or API route (Vercel, Netlify, or Express)
   - Requires API key for OpenAI/Claude (env var)
   - For voice: Whisper API or similar for STT

### 5. Fallback Without Backend

- If no backend/API key: keep current rule-based advice
- Add "Ask" UI that shows "Connect an API to enable Q&A" or uses a client-side option (e.g. Cursor-like local model if available)

---

*Resume implementation when internet is back. Start with data model extension, then recording parser, then advisor Q&A endpoint.*
