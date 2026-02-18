/**
 * Parse API – extracts date from free-form text.
 * Used when user enters info like "today's update" or "remember for March 15".
 * Expects: POST { text, defaultDate: "DD/MM/YYYY" }
 * Returns: { date: "DD/MM/YYYY" }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
  }
  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }
  const { text, defaultDate } = body || {}
  const defaultDDMM = defaultDate || defaultToday()

  const prompt = `Extract the date from this Hebrew/English text about kindergarten notes.
Today's date is ${new Date().toISOString().split('T')[0]} (YYYY-MM-DD).
If the text mentions "היום"/today → use today. "אתמול"/yesterday → yesterday. "מחר"/tomorrow → tomorrow.
If a specific date is mentioned (e.g. 15 במרץ, March 15), use that.
If no date is clear, use the default: ${defaultDDMM}.
Return ONLY a date in DD/MM/YYYY format, nothing else.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text || '' }
        ],
        max_tokens: 20
      })
    })
    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: `OpenAI: ${response.status}` })
    }
    const data = await response.json()
    let extracted = (data.choices?.[0]?.message?.content || '').trim().replace(/\s/g, '')
    const match = extracted.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/) || extracted.match(/(\d{2,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/)
    if (match) {
      let d, m, y
      if (match[1].length === 4) {
        [, y, m, d] = match
      } else {
        [, d, m, y] = match
        if (y.length === 2) y = '20' + y
      }
      if (m.length === 1) m = '0' + m
      if (d.length === 1) d = '0' + d
      extracted = `${d}/${m}/${y}`
    }
    return res.status(200).json({ date: extracted || defaultDDMM })
  } catch (err) {
    console.error('Parse error:', err)
    return res.status(500).json({ date: defaultDDMM })
  }
}

function defaultToday() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
