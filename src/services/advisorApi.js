/**
 * Advisor API service – sends queries to AI backend.
 * The advisor answers free-form questions using ALL stored knowledge:
 * children, employees, events, schedule, daily summaries, and unstructured voice/text records.
 * Set VITE_ADVISOR_API_URL to enable AI-powered responses.
 */

import { buildAdvisorContext } from '../utils/advisorContext'

export async function askAdvisor(query) {
  const baseUrl = import.meta.env.VITE_ADVISOR_API_URL
  const context = buildAdvisorContext({ maxEventsDays: 365, maxEvents: 500 })

  if (!baseUrl) {
    return {
      answer: 'לחיבור ליועץ AI, הגדר VITE_ADVISOR_API_URL ופרוס את ה-backend (api/advisor). ראה ADVISOR_V2_DESIGN.md.',
      source: 'none'
    }
  }

  const url = baseUrl.replace(/\/$/, '') + '/api/advisor'
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, context })
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    return { answer: data.answer || data.text || 'לא התקבלה תשובה.', source: 'ai' }
  } catch (err) {
    return {
      answer: `שגיאה בחיבור ליועץ: ${err.message}. נסה שוב או בדוק את הקונפיגורציה.`,
      source: 'error'
    }
  }
}
