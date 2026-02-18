# Advisor V2 – Unstructured Recording + AI-Powered Q&A

## Vision

### 1. Unstructured Recording

**Goal**: Accept any voice or text input and store it for later AI querying.

- **Text input**: Type or paste free-form notes
- **Live voice**: Browser Speech Recognition (Hebrew) – no backend needed
- **Recorded voice**: Optional – upload audio to backend for Whisper transcription

All records are stored as `unstructured_record` events with `raw` = transcript. The AI advisor uses this along with children, employees, schedule, and other events to answer any question.

### 2. AI Advisor – Free-Form Q&A

**Goal**: Answer any question about the kindergarten based on all stored knowledge.

- **Query**: Free-form text (e.g. "מתי הבטחתי לאם של יוסי?" "מה כתבתי אתמול?")
- **Context**: children, employees, events (including unstructured records), schedule
- **Response**: AI-generated answer in Hebrew

### 3. Backend Deployment

Deploy `api/` to Vercel:

```bash
vercel
# Set OPENAI_API_KEY in Vercel project settings
```

Set `VITE_ADVISOR_API_URL` to your deployed URL (e.g. `https://olam-katan-xxx.vercel.app`).

**Endpoints**:
- `POST /api/advisor` – `{ query, context }` → `{ answer }`
- `POST /api/transcribe` – FormData with `audio` file → `{ text }` (optional; for pre-recorded audio)

### 4. Schema

Unstructured records use event type `unstructured_record`:

```js
{
  id, type: 'unstructured_record', date, createdAt, source: 'manual',
  raw: "הבטחתי לאם של יוסי להתקשר",
  description: "...",
  scope: 'general'
}
```

### 5. Future: Push Notifications

The advisor can be extended to generate proactive reminders and send push notifications based on stored information (e.g. "הבטחת להתקשר לאם יוסי – לפני שבועיים").
