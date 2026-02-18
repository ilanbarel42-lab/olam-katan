/**
 * Rule-based advice engine for kindergarten manager.
 * Analyzes events and produces reminders, suggestions, and highlights.
 *
 * V2 plan: See ADVISOR_V2_DESIGN.md – replace with LLM-powered advisor that
 * can answer questions ("when did I last give X a gift?") and analyze free-form data.
 */

import { getEvents, getChildren, getEmployees, getAdvisorConfig } from './storage'

const GIFT_SUGGEST_INTERVAL_MONTHS = 6
const INCIDENT_FOLLOWUP_DAYS = 7
const PARENT_PROMISE_FOLLOWUP_DAYS = 14

function parseEventDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split(/[\/\-]/)
  if (parts.length !== 3) return null
  let y, m, d
  if (parts[0].length === 4) {
    [y, m, d] = parts.map(Number)
  } else {
    [d, m, y] = parts.map(Number)
    if (m && m < 13) m -= 1
  }
  const date = new Date(y, m, d)
  return isNaN(date.getTime()) ? null : date
}

function daysBetween(d1, d2) {
  const a = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate())
  const b = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate())
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

// Israel work week: Sun(0)-Thu(4). "Next 2 weeks" = through end of next Thursday
export function getAdvice() {
  const events = getEvents() || []
  const children = getChildren() || []
  const employees = getEmployees() || []
  const advisorConfig = getAdvisorConfig()
  const adviceWindowDays = advisorConfig.adviceWindowDays || 14
  const today = new Date()
  const advice = []

  // Upcoming events (recorded or manual) in the advice window (skip parent_promise - handled below)
  for (const e of events) {
    if (e.type === 'parent_promise') continue
    const eventDate = parseEventDate(e.date)
    if (!eventDate || !e.date) continue
    const daysUntil = daysBetween(today, eventDate)
    if (daysUntil >= 0 && daysUntil <= adviceWindowDays) {
      const child = e.entityType === 'child' ? children.find(c => c.id === e.entityId) : null
      const emp = e.entityType === 'employee' ? employees.find(em => em.id === e.entityId) : null
      const who = child ? child.childName : emp ? emp.name : ''
      advice.push({
        id: `upcoming-${e.id}`,
        type: 'upcoming_event',
        priority: daysUntil <= 3 ? 'high' : 'medium',
        title: e.type === 'parent_promise' ? `הבטחה להורה${who ? ` – ${who}` : ''}` : (who || 'אירוע'),
        description: e.description || '',
        date: e.date,
        entityId: e.entityId,
        entityType: e.entityType
      })
    }
  }

  // Parent promises (unresolved)
  const parentPromises = events.filter(
    e => e.type === 'parent_promise' && !e.resolved
  )
  for (const e of parentPromises) {
    const eventDate = parseEventDate(e.date)
    const daysSince = eventDate ? daysBetween(eventDate, today) : 0
    const child = children.find(c => c.id === e.entityId)
    const childName = child?.childName || e.entityId || 'ילד'
    advice.push({
      id: `promise-${e.id}`,
      type: 'parent_promise',
      priority: daysSince > PARENT_PROMISE_FOLLOWUP_DAYS ? 'high' : 'medium',
      title: `הבטחה להורה – ${childName}`,
      description: e.description || 'שיחה/מעקב שהובטח',
      date: e.date,
      entityId: e.entityId,
      entityType: 'child'
    })
  }

  // Staff gifts – last gift per employee
  const giftEvents = events.filter(e => e.type === 'staff_gift' || (e.type === 'staff_event' && /מתנה|גמול/.test(e.description || '')))
  for (const emp of employees.filter(e => e.status !== 'discontinued')) {
    const empGifts = giftEvents
      .filter(e => e.entityId === emp.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    const last = empGifts[0]
    if (last) {
      const eventDate = parseEventDate(last.date)
      if (eventDate) {
        const monthsSince = (today.getFullYear() - eventDate.getFullYear()) * 12 + (today.getMonth() - eventDate.getMonth())
        if (monthsSince >= GIFT_SUGGEST_INTERVAL_MONTHS) {
          advice.push({
            id: `gift-${emp.id}`,
            type: 'staff_gift',
            priority: 'medium',
            title: `מתנה/גמול – ${emp.name || 'עובד'}`,
            description: `לפני ${monthsSince} חודשים. אולי הגיע הזמן להביע הערכה?`,
            date: last.date,
            entityId: emp.id,
            entityType: 'employee'
          })
        }
      }
    }
  }

  // Child incidents – recent falls/incidents to follow up
  const incidentEvents = events.filter(
    e => (e.type === 'child_incident' || e.type === 'child_event') && e.entityId
  )
  for (const e of incidentEvents) {
    const eventDate = parseEventDate(e.date)
    if (!eventDate) continue
    const daysSince = daysBetween(eventDate, today)
    if (daysSince >= 0 && daysSince <= INCIDENT_FOLLOWUP_DAYS) {
      const child = children.find(c => c.id === e.entityId)
      const childName = child?.childName || e.entityId || 'ילד'
      advice.push({
        id: `incident-${e.id}`,
        type: 'child_incident',
        priority: 'medium',
        title: `מעקב אחר אירוע – ${childName}`,
        description: e.description || 'אירוע שכבר אירע – כדאי לבדוק/לעדכן',
        date: e.date,
        entityId: e.entityId,
        entityType: 'child'
      })
    }
  }

  // Upcoming: Sept 1 transition (only if within advice window)
  const sep1 = new Date(today.getFullYear(), 8, 1)
  if (today < sep1) {
    const daysToSep1 = daysBetween(today, sep1)
    if (daysToSep1 <= adviceWindowDays && daysToSep1 >= 0) {
      advice.push({
        id: 'upcoming-sep1',
        type: 'upcoming',
        priority: 'medium',
        title: 'מעבר 1 בספטמבר',
        description: `בעוד ${daysToSep1} ימים. מומלץ להתכונן למעברי קבוצות.`,
        date: null,
        entityId: null,
        entityType: null
      })
    }
  }

  // Recent summaries and unstructured records – remind of items that might need follow-up
  const dailySummaries = events.filter(e => e.type === 'daily_summary' || e.type === 'unstructured_record').slice(-5)
  for (const ds of dailySummaries) {
    const desc = (ds.description || '').toLowerCase()
    if (/הבטחתי|להתקשר|לעדכן|לחזור/.test(desc) && !advice.some(a => a.date === ds.date && a.type === 'parent_promise')) {
      advice.push({
        id: `summary-followup-${ds.id}`,
        type: 'general',
        priority: 'low',
        title: 'סיכום יומי – בדיקה',
        description: `ביום ${ds.date}: "${(ds.description || '').slice(0, 80)}..." – אולי יש פעולה נדרשת?`,
        date: ds.date,
        entityId: null,
        entityType: null
      })
    }
  }

  const seen = new Set()
  const deduped = advice.filter(a => {
    const key = a.entityId ? `${a.type}-${a.entityId}-${a.date}` : a.id
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduped.sort((a, b) => {
    const pOrder = { high: 0, medium: 1, low: 2 }
    return (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1)
  })
}
