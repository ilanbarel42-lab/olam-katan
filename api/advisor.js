/**
 * Advisor API – receives query + kindergarten context, returns AI answer.
 * Deploy to Vercel (or similar) and set OPENAI_API_KEY.
 * Expects: POST { query, context: { children, employees, events, ageGroups, schedule } }
 * Returns: { answer }
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
  const { query, context } = body || {}
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query' })
  }

  const ctx = context || {}
  const events = ctx.events || []
  const children = ctx.children || []
  const employees = ctx.employees || []
  const ageGroups = ctx.ageGroups || []
  const schedule = ctx.schedule || {}

  const contextText = [
    '## ילדים',
    children.length
      ? children.map(c => `- ${c.childName || 'ללא שם'} (${c.group || ''}): הורים ${c.parent1Name || ''} / ${c.parent2Name || ''}, טלפון ${c.parent1Phone || ''}`).join('\n')
      : '(אין)',
    '',
    '## עובדים',
    employees.length
      ? employees.map(e => `- ${e.name || 'ללא שם'}: ${e.role || ''}, טלפון ${e.phone || ''}`).join('\n')
      : '(אין)',
    '',
    '## אירועים והקלטות (כולל סיכומים יומיים ורישומים חופשיים)',
    events.length
      ? events
          .map(e => `- ${e.date || 'ללא תאריך'} [${e.type}]: ${e.raw || e.description || ''}`)
          .join('\n')
      : '(אין)',
    '',
    '## מערכת שעות',
    Object.keys(schedule).length ? JSON.stringify(schedule, null, 2) : '(אין)'
  ].join('\n')

  const systemPrompt = `אתה יועץ חכם לגן ילדים. יש לך גישה לכל המידע על הילדים, העובדים, האירועים, הסיכומים היומיים וההקלטות/רישומים החופשיים שהמשתמש שמר.
ענה על שאלות המשתמש בעברית, בקצרה וברור. התבסס אך ורק על המידע שסופק. אם אין מידע רלוונטי, אמור זאת.`

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `המידע בגן:\n\n${contextText}\n\n---\nשאלת המשתמש: ${query}` }
        ],
        max_tokens: 1000
      })
    })
    if (!response.ok) {
      const err = await response.text()
      console.error('OpenAI error:', response.status, err)
      return res.status(502).json({ error: `OpenAI: ${response.status}` })
    }
    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content?.trim() || 'לא התקבלה תשובה.'
    return res.status(200).json({ answer })
  } catch (err) {
    console.error('Advisor error:', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
