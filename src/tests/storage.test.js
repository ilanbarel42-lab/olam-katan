/**
 * Tests for src/utils/storage.js
 * SANDBOX: Supabase mocked off (setup.js). All reads/writes go to jsdom localStorage.
 * Production data is never touched.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_ADVISOR_CONFIG,
  getAdvisorConfig,
  saveAdvisorConfig,
  shouldShowAdvisorReminder,
  getChildren,
  getEmployees,
  getAgeGroups,
  getSchedule,
  getEvents,
  saveChildren,
  saveEmployees,
  saveAgeGroups,
  saveSchedule,
  saveEvents,
  loadAll
} from '../utils/storage.js'

// ─── DEFAULT_ADVISOR_CONFIG ───────────────────────────────────────────────────

describe('DEFAULT_ADVISOR_CONFIG', () => {
  it('has enabled=true', () => {
    expect(DEFAULT_ADVISOR_CONFIG.enabled).toBe(true)
  })

  it('has 5 working days', () => {
    expect(DEFAULT_ADVISOR_CONFIG.days).toHaveLength(5)
    expect(DEFAULT_ADVISOR_CONFIG.days).toContain('sunday')
    expect(DEFAULT_ADVISOR_CONFIG.days).toContain('thursday')
    expect(DEFAULT_ADVISOR_CONFIG.days).not.toContain('friday')
    expect(DEFAULT_ADVISOR_CONFIG.days).not.toContain('saturday')
  })

  it('defaults to 17:00', () => {
    expect(DEFAULT_ADVISOR_CONFIG.hour).toBe(17)
    expect(DEFAULT_ADVISOR_CONFIG.minute).toBe(0)
  })

  it('defaults to 14 day advice window', () => {
    expect(DEFAULT_ADVISOR_CONFIG.adviceWindowDays).toBe(14)
  })
})

// ─── getAdvisorConfig / saveAdvisorConfig ─────────────────────────────────────

describe('getAdvisorConfig', () => {
  it('returns defaults when nothing stored', () => {
    const cfg = getAdvisorConfig()
    expect(cfg.enabled).toBe(true)
    expect(cfg.hour).toBe(17)
    expect(cfg.minute).toBe(0)
    expect(cfg.adviceWindowDays).toBe(14)
  })

  it('returns stored values after save', () => {
    saveAdvisorConfig({ enabled: false, days: ['monday'], hour: 9, minute: 30, adviceWindowDays: 7 })
    const cfg = getAdvisorConfig()
    expect(cfg.enabled).toBe(false)
    expect(cfg.hour).toBe(9)
    expect(cfg.minute).toBe(30)
    expect(cfg.adviceWindowDays).toBe(7)
    expect(cfg.days).toEqual(['monday'])
  })

  it('falls back to default days when stored days is not array', () => {
    saveAdvisorConfig({ enabled: true, days: null, hour: 17, minute: 0, adviceWindowDays: 14 })
    const cfg = getAdvisorConfig()
    expect(Array.isArray(cfg.days)).toBe(true)
    expect(cfg.days).toEqual(DEFAULT_ADVISOR_CONFIG.days)
  })

  it('falls back to default hour when stored hour is not number', () => {
    saveAdvisorConfig({ enabled: true, days: ['monday'], hour: 'bad', minute: 0, adviceWindowDays: 14 })
    const cfg = getAdvisorConfig()
    expect(cfg.hour).toBe(DEFAULT_ADVISOR_CONFIG.hour)
  })

  it('falls back to default adviceWindowDays when stored value is not number', () => {
    saveAdvisorConfig({ enabled: true, days: ['monday'], hour: 17, minute: 0, adviceWindowDays: 'bad' })
    const cfg = getAdvisorConfig()
    expect(cfg.adviceWindowDays).toBe(DEFAULT_ADVISOR_CONFIG.adviceWindowDays)
  })

  it('treats enabled=false stored value as false', () => {
    saveAdvisorConfig({ ...DEFAULT_ADVISOR_CONFIG, enabled: false })
    expect(getAdvisorConfig().enabled).toBe(false)
  })
})

// ─── shouldShowAdvisorReminder ────────────────────────────────────────────────

describe('shouldShowAdvisorReminder', () => {
  it('returns false when disabled', () => {
    saveAdvisorConfig({ ...DEFAULT_ADVISOR_CONFIG, enabled: false })
    expect(shouldShowAdvisorReminder()).toBe(false)
  })

  it('returns false when today is not in configured days', () => {
    // Configure for a day that is definitely not today
    const allDays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    const now = new Date()
    const todayName = allDays[now.getDay()]
    const otherDays = allDays.filter(d => d !== todayName)
    saveAdvisorConfig({ ...DEFAULT_ADVISOR_CONFIG, days: otherDays })
    expect(shouldShowAdvisorReminder()).toBe(false)
  })

  it('returns false when current time is before configured time', () => {
    const allDays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    const now = new Date()
    const todayName = allDays[now.getDay()]
    // Set reminder for 1 hour after current time
    const futureHour = Math.min(now.getHours() + 2, 23)
    saveAdvisorConfig({ ...DEFAULT_ADVISOR_CONFIG, days: [todayName], hour: futureHour, minute: 0 })
    expect(shouldShowAdvisorReminder()).toBe(false)
  })

  it('returns false when current time is >60 min after configured time', () => {
    const allDays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    const now = new Date()
    const todayName = allDays[now.getDay()]
    // Set reminder for 2 hours before current time
    const pastHour = Math.max(now.getHours() - 2, 0)
    saveAdvisorConfig({ ...DEFAULT_ADVISOR_CONFIG, days: [todayName], hour: pastHour, minute: 0 })
    expect(shouldShowAdvisorReminder()).toBe(false)
  })
})

// ─── Cache getters (after loadAll in localStorage mode) ───────────────────────

describe('cache getters – localStorage mode', () => {
  beforeEach(async () => {
    await loadAll()
  })

  it('getChildren returns array', () => {
    expect(Array.isArray(getChildren())).toBe(true)
  })

  it('getEmployees returns array', () => {
    expect(Array.isArray(getEmployees())).toBe(true)
  })

  it('getAgeGroups returns array', () => {
    expect(Array.isArray(getAgeGroups())).toBe(true)
  })

  it('getSchedule returns object', () => {
    expect(typeof getSchedule()).toBe('object')
    expect(getSchedule()).not.toBeNull()
  })

  it('getEvents returns array', () => {
    expect(Array.isArray(getEvents())).toBe(true)
  })
})

// ─── save/load round-trips ────────────────────────────────────────────────────

describe('save/load round-trips – localStorage', () => {
  beforeEach(async () => {
    await loadAll()
  })

  it('saveChildren persists and is readable', async () => {
    const kids = [{ id: 'c1', childName: 'אבי' }]
    saveChildren(kids)
    await loadAll()
    expect(getChildren()).toEqual(kids)
  })

  it('saveEmployees persists and is readable', async () => {
    const emps = [{ id: 'e1', name: 'רות', status: 'permanent', role: 'lead' }]
    saveEmployees(emps)
    await loadAll()
    expect(getEmployees()).toEqual(emps)
  })

  it('saveAgeGroups persists and is readable', async () => {
    const groups = [{ id: 'g1', name: 'תינוקות', minAge: 5, maxAge: 10 }]
    saveAgeGroups(groups)
    await loadAll()
    expect(getAgeGroups()).toEqual(groups)
  })

  it('saveSchedule persists and is readable', async () => {
    const schedule = { 'week-2026-01': { assignments: {} } }
    saveSchedule(schedule)
    await loadAll()
    expect(getSchedule()).toEqual(schedule)
  })

  it('saveEvents persists and is readable', async () => {
    const events = [{ id: 'ev1', type: 'general', date: '14/03/2026', description: 'test' }]
    saveEvents(events)
    await loadAll()
    expect(getEvents()).toEqual(events)
  })

  it('saving empty children replaces previous data', async () => {
    saveChildren([{ id: 'c1', childName: 'ילד' }])
    saveChildren([])
    await loadAll()
    expect(getChildren()).toEqual([])
  })

  it('saving multiple children stores all', async () => {
    const kids = [
      { id: 'c1', childName: 'אלי' },
      { id: 'c2', childName: 'שרי' },
      { id: 'c3', childName: 'בני' }
    ]
    saveChildren(kids)
    await loadAll()
    expect(getChildren()).toHaveLength(3)
  })
})
