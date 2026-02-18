/**
 * Builds context for the AI advisor from all kindergarten data.
 * Limits events by date to fit context window; includes children, employees, age groups, schedule.
 */

import { getChildren, getAgeGroups, getEmployees, getEvents, getSchedule } from './storage'

const MAX_EVENTS_DAYS = 365
const MAX_EVENTS = 500

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

export function buildAdvisorContext(options = {}) {
  const { maxEventsDays = MAX_EVENTS_DAYS, maxEvents = MAX_EVENTS } = options
  const today = new Date()
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - maxEventsDays)

  const children = getChildren() || []
  const employees = getEmployees() || []
  const ageGroups = getAgeGroups() || []
  const schedule = getSchedule() || {}
  const allEvents = getEvents() || []

  const events = allEvents
    .filter(e => {
      const d = parseEventDate(e.date)
      if (!d) return true
      return d >= cutoff
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, maxEvents)

  return {
    children: children.map(c => ({
      id: c.id,
      childName: c.childName,
      dateOfBirth: c.dateOfBirth,
      entryDate: c.entryDate,
      registerStatus: c.registerStatus,
      group: c.group,
      nextGroup: c.nextGroup,
      parent1Name: c.parent1Name,
      parent1Phone: c.parent1Phone,
      parent2Name: c.parent2Name,
      parent2Phone: c.parent2Phone,
      healthNotes: c.healthNotes,
      nutritionNotes: c.nutritionNotes
    })),
    employees: employees.map(e => ({
      id: e.id,
      name: e.name,
      phone: e.phone,
      status: e.status,
      role: e.role,
      groupId: e.groupId,
      freeDay: e.freeDay,
      workStart: e.workStart,
      workEnd: e.workEnd
    })),
    ageGroups: ageGroups.map(g => ({
      id: g.id,
      name: g.name,
      minAge: g.minAge,
      maxAge: g.maxAge,
      maxCapacity: g.maxCapacity,
      ratio: g.ratio
    })),
    events: events.map(e => ({
      id: e.id,
      type: e.type,
      date: e.date,
      entityType: e.entityType,
      entityId: e.entityId,
      raw: e.raw || e.description,
      summary: e.summary,
      description: e.description,
      scope: e.scope,
      metadata: e.metadata,
      resolved: e.resolved,
      createdAt: e.createdAt
    })),
    schedule: schedule,
    contextBuiltAt: today.toISOString(),
    eventCount: events.length,
    totalEventCount: allEvents.length
  }
}
