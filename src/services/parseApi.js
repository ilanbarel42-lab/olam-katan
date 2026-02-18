/**
 * Parse API – extracts date from free-form text.
 * Call when user saves info to resolve "today", "yesterday", or explicit dates.
 */

export async function parseDateFromText(text, defaultDDMM) {
  const baseUrl = import.meta.env.VITE_ADVISOR_API_URL
  if (!baseUrl || !text?.trim()) return defaultDDMM

  try {
    const url = baseUrl.replace(/\/$/, '') + '/api/parse'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), defaultDate: defaultDDMM })
    })
    if (!res.ok) return defaultDDMM
    const data = await res.json()
    return data.date || defaultDDMM
  } catch {
    return defaultDDMM
  }
}
