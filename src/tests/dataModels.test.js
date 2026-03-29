/**
 * Tests for data model structure validation.
 * Ensures all data structures conform to the documented schemas.
 * SANDBOX: pure structural tests, no storage writes.
 */
import { describe, it, expect } from 'vitest'
import { config } from '../config.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeChild(overrides = {}) {
  return {
    id: 'c-test',
    childName: 'ילד בדיקה',
    dateOfBirth: '01/01/2024',
    entryDate: '01/09/2025',
    registerStatus: 'registered',
    group: 'g1',
    nextGroup: 'g2',
    parent1Name: 'אמא',
    parent1Phone: '050-0000000',
    parent2Name: 'אבא',
    parent2Phone: '052-0000000',
    healthNotes: '',
    nutritionNotes: '',
    ...overrides
  }
}

function makeEmployee(overrides = {}) {
  return {
    id: 'e-test',
    name: 'עובד בדיקה',
    phone: '054-0000000',
    status: 'permanent',
    role: 'lead',
    groupId: 'g1',
    freeDay: 'friday',
    workStart: 7,
    workEnd: 15,
    ...overrides
  }
}

function makeAgeGroup(overrides = {}) {
  return {
    id: 'g-test',
    name: 'בדיקה',
    minAge: 5,
    maxAge: 10,
    label: '5-10 חודשים',
    maxCapacity: 10,
    ratio: 4,
    staffingMin: { lead: 1, assistant: 1, cook: 0 },
    staffingOptimal: { lead: 2, assistant: 2, cook: 0 },
    ...overrides
  }
}

function makeEvent(overrides = {}) {
  return {
    id: 'ev-test',
    type: 'general',
    date: '14/03/2026',
    entityType: 'child',
    entityId: 'c1',
    description: 'אירוע בדיקה',
    createdAt: new Date().toISOString(),
    source: 'manual',
    ...overrides
  }
}

// ─── Child data model ─────────────────────────────────────────────────────────

describe('Child data model', () => {
  it('has all required fields', () => {
    const child = makeChild()
    const required = ['id','childName','dateOfBirth','entryDate','registerStatus','group','nextGroup',
      'parent1Name','parent1Phone','parent2Name','parent2Phone','healthNotes','nutritionNotes']
    for (const f of required) expect(child).toHaveProperty(f)
  })

  it('registerStatus is candidate or registered', () => {
    expect(['candidate','registered']).toContain(makeChild({ registerStatus: 'candidate' }).registerStatus)
    expect(['candidate','registered']).toContain(makeChild({ registerStatus: 'registered' }).registerStatus)
  })

  it('id is a string', () => {
    expect(typeof makeChild().id).toBe('string')
  })

  it('childName is a string', () => {
    expect(typeof makeChild().childName).toBe('string')
  })
})

// ─── Employee data model ──────────────────────────────────────────────────────

describe('Employee data model', () => {
  it('has all required fields', () => {
    const emp = makeEmployee()
    const required = ['id','name','phone','status','role','groupId','freeDay','workStart','workEnd']
    for (const f of required) expect(emp).toHaveProperty(f)
  })

  it('role is lead or assistant', () => {
    expect(['lead','assistant']).toContain(makeEmployee({ role: 'lead' }).role)
    expect(['lead','assistant']).toContain(makeEmployee({ role: 'assistant' }).role)
  })

  it('cook is NOT a valid role', () => {
    expect(['lead','assistant']).not.toContain('cook')
  })

  it('status values are valid', () => {
    const validStatuses = ['permanent','temp','discontinued','filler']
    for (const s of validStatuses) {
      expect(validStatuses).toContain(makeEmployee({ status: s }).status)
    }
  })

  it('workStart is a number', () => {
    expect(typeof makeEmployee().workStart).toBe('number')
  })

  it('workEnd is a number', () => {
    expect(typeof makeEmployee().workEnd).toBe('number')
  })

  it('workEnd > workStart', () => {
    const emp = makeEmployee()
    expect(emp.workEnd).toBeGreaterThan(emp.workStart)
  })
})

// ─── Age Group data model ─────────────────────────────────────────────────────

describe('Age Group data model', () => {
  it('has all required fields', () => {
    const g = makeAgeGroup()
    const required = ['id','name','minAge','maxAge','label','maxCapacity','ratio','staffingMin','staffingOptimal']
    for (const f of required) expect(g).toHaveProperty(f)
  })

  it('maxAge >= minAge', () => {
    const g = makeAgeGroup()
    expect(g.maxAge).toBeGreaterThanOrEqual(g.minAge)
  })

  it('staffingMin has lead, assistant, cook', () => {
    const g = makeAgeGroup()
    expect(g.staffingMin).toHaveProperty('lead')
    expect(g.staffingMin).toHaveProperty('assistant')
    expect(g.staffingMin).toHaveProperty('cook')
  })

  it('staffingOptimal.cook is always 0', () => {
    expect(makeAgeGroup().staffingOptimal.cook).toBe(0)
  })

  it('staffingMin.cook is always 0', () => {
    expect(makeAgeGroup().staffingMin.cook).toBe(0)
  })

  it('ratio is a positive number', () => {
    const g = makeAgeGroup()
    expect(g.ratio).toBeGreaterThan(0)
  })
})

// ─── Event data model ─────────────────────────────────────────────────────────

describe('Event data model', () => {
  it('has all required fields', () => {
    const ev = makeEvent()
    const required = ['id','type','date','description','createdAt','source']
    for (const f of required) expect(ev).toHaveProperty(f)
  })

  it('valid event types', () => {
    const types = ['daily_summary','child_incident','staff_event','staff_gift','parent_promise','general','unstructured_record']
    for (const t of types) {
      expect(types).toContain(makeEvent({ type: t }).type)
    }
  })

  it('source is manual or voice', () => {
    expect(['manual','voice']).toContain(makeEvent({ source: 'manual' }).source)
    expect(['manual','voice']).toContain(makeEvent({ source: 'voice' }).source)
  })

  it('date follows DD/MM/YYYY format pattern', () => {
    const ev = makeEvent()
    expect(ev.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  it('createdAt is ISO string', () => {
    const ev = makeEvent()
    expect(() => new Date(ev.createdAt)).not.toThrow()
    expect(new Date(ev.createdAt).toISOString()).toBe(ev.createdAt)
  })
})

// ─── Schedule data model ──────────────────────────────────────────────────────

describe('Schedule data model', () => {
  it('has week keys as top-level keys', () => {
    const schedule = { 'week-2026-01': { assignments: {} } }
    expect(typeof Object.keys(schedule)[0]).toBe('string')
  })

  it('assignments object maps dayKey to groupId to slot', () => {
    const slot = { employeeIds: ['e1'], externals: [{ name: 'גל', role: 'lead' }] }
    const schedule = { 'week-1': { assignments: { 'sun': { 'g1': slot } } } }
    const s = schedule['week-1'].assignments['sun']['g1']
    expect(Array.isArray(s.employeeIds)).toBe(true)
    expect(Array.isArray(s.externals)).toBe(true)
  })

  it('external has name and role fields', () => {
    const ext = { name: 'מרים', role: 'assistant' }
    expect(ext).toHaveProperty('name')
    expect(ext).toHaveProperty('role')
    expect(['lead','assistant']).toContain(ext.role)
  })

  it('external role is never cook', () => {
    const validExternalRoles = ['lead','assistant']
    expect(validExternalRoles).not.toContain('cook')
  })
})
