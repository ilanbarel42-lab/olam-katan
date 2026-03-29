/**
 * Tests for pure business logic functions.
 * These functions are inlined from component files and tested independently.
 * SANDBOX: no localStorage writes, no Supabase calls.
 */
import { describe, it, expect } from 'vitest'
import { config, getReferenceDate } from '../config.js'

// ─── Re-implemented pure functions (mirrors component logic) ─────────────────

const WORK_MIN = 7
const WORK_MAX = 17

function parseTimeToDecimal(str) {
  if (!str || typeof str !== 'string') return null
  const s = str.trim()
  if (/^\d+$/.test(s)) return Math.min(WORK_MAX, Math.max(WORK_MIN, Number(s)))
  const m1 = s.match(/^(\d{1,2}):(\d{1,2})$/)
  if (m1) {
    const h = parseInt(m1[1], 10)
    const m = parseInt(m1[2], 10)
    if (m >= 60) return null
    const dec = h + m / 60
    return Math.min(WORK_MAX, Math.max(WORK_MIN, dec))
  }
  const m2 = s.match(/^(\d{1,2})\.(\d{1,2})$/)
  if (m2) {
    const dec = parseFloat(s)
    return Math.min(WORK_MAX, Math.max(WORK_MIN, dec))
  }
  const n = parseFloat(s)
  return Number.isFinite(n) ? Math.min(WORK_MAX, Math.max(WORK_MIN, n)) : null
}

function decimalToTimeStr(decimal) {
  if (decimal == null || !Number.isFinite(decimal)) return `${WORK_MIN}:00`
  const h = Math.floor(decimal)
  const m = Math.round((decimal - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

function clampDecimal(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return WORK_MIN
  return Math.min(WORK_MAX, Math.max(WORK_MIN, x))
}

function parseEuropeanDate(dateString) {
  if (!dateString) return null
  let parts = dateString.split('/')
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) return new Date(year, month, day)
  }
  parts = dateString.split('-')
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) return new Date(year, month, day)
  }
  return null
}

function ageInMonthsAt(birthDate, refDate) {
  if (!birthDate || !refDate) return null
  let age = (refDate.getFullYear() - birthDate.getFullYear()) * 12 +
    (refDate.getMonth() - birthDate.getMonth())
  if (refDate.getDate() < birthDate.getDate()) age--
  return age
}

function calculateGroupOrAgeStatus(dateOfBirth, refDate, groups) {
  if (!dateOfBirth || !refDate || !groups?.length) return null
  const birthDate = parseEuropeanDate(dateOfBirth)
  if (!birthDate) return null
  const ageMonths = ageInMonthsAt(birthDate, refDate)
  if (ageMonths === null) return null
  for (const group of groups) {
    if (ageMonths >= group.minAge && ageMonths <= group.maxAge) {
      return { status: 'match', id: group.id, name: group.name || group.label, ageInMonths: ageMonths }
    }
  }
  const minAge = Math.min(...groups.map(g => g.minAge))
  return { status: ageMonths < minAge ? 'tooSmall' : 'tooBig', ageInMonths: ageMonths }
}

const DEFAULT_GROUPS = config.defaultAgeGroups

// ─── parseTimeToDecimal ───────────────────────────────────────────────────────

describe('parseTimeToDecimal', () => {
  it('parses H:MM format', () => {
    expect(parseTimeToDecimal('7:30')).toBeCloseTo(7.5)
  })

  it('parses HH:MM format', () => {
    expect(parseTimeToDecimal('08:00')).toBe(8)
  })

  it('parses integer string', () => {
    expect(parseTimeToDecimal('10')).toBe(10)
  })

  it('parses decimal string', () => {
    expect(parseTimeToDecimal('7.5')).toBeCloseTo(7.5)
  })

  it('clamps below WORK_MIN to 7', () => {
    expect(parseTimeToDecimal('5')).toBe(7)
  })

  it('clamps above WORK_MAX to 17', () => {
    expect(parseTimeToDecimal('20')).toBe(17)
  })

  it('returns null for empty string', () => {
    expect(parseTimeToDecimal('')).toBeNull()
  })

  it('returns null for non-numeric string', () => {
    expect(parseTimeToDecimal('abc')).toBeNull()
  })

  it('returns null for invalid minutes ≥60', () => {
    expect(parseTimeToDecimal('8:60')).toBeNull()
  })

  it('parses 17:00 exactly', () => {
    expect(parseTimeToDecimal('17:00')).toBe(17)
  })

  it('parses 7:00 exactly', () => {
    expect(parseTimeToDecimal('7:00')).toBe(7)
  })

  it('parses 7:15 correctly', () => {
    expect(parseTimeToDecimal('7:15')).toBeCloseTo(7.25)
  })

  it('parses 16:45 correctly', () => {
    expect(parseTimeToDecimal('16:45')).toBeCloseTo(16.75)
  })

  it('returns null for null input', () => {
    expect(parseTimeToDecimal(null)).toBeNull()
  })
})

// ─── decimalToTimeStr ─────────────────────────────────────────────────────────

describe('decimalToTimeStr', () => {
  it('converts 7.5 to 7:30', () => {
    expect(decimalToTimeStr(7.5)).toBe('7:30')
  })

  it('converts 8 to 8:00', () => {
    expect(decimalToTimeStr(8)).toBe('8:00')
  })

  it('converts 17 to 17:00', () => {
    expect(decimalToTimeStr(17)).toBe('17:00')
  })

  it('converts 7.25 to 7:15', () => {
    expect(decimalToTimeStr(7.25)).toBe('7:15')
  })

  it('handles null → default WORK_MIN string', () => {
    expect(decimalToTimeStr(null)).toBe('7:00')
  })

  it('handles NaN → default WORK_MIN string', () => {
    expect(decimalToTimeStr(NaN)).toBe('7:00')
  })
})

// ─── clampDecimal ─────────────────────────────────────────────────────────────

describe('clampDecimal', () => {
  it('clamps below min', () => expect(clampDecimal(5)).toBe(7))
  it('clamps above max', () => expect(clampDecimal(20)).toBe(17))
  it('passes through valid value', () => expect(clampDecimal(12)).toBe(12))
  it('returns WORK_MIN for NaN', () => expect(clampDecimal(NaN)).toBe(7))
  it('returns WORK_MIN for non-number', () => expect(clampDecimal('x')).toBe(7))
})

// ─── parseEuropeanDate ────────────────────────────────────────────────────────

describe('parseEuropeanDate', () => {
  it('parses DD/MM/YYYY', () => {
    const d = parseEuropeanDate('15/03/2025')
    expect(d?.getFullYear()).toBe(2025)
    expect(d?.getMonth()).toBe(2)
    expect(d?.getDate()).toBe(15)
  })

  it('parses YYYY-MM-DD', () => {
    const d = parseEuropeanDate('2025-03-15')
    expect(d?.getFullYear()).toBe(2025)
    expect(d?.getMonth()).toBe(2)
    expect(d?.getDate()).toBe(15)
  })

  it('returns null for null input', () => {
    expect(parseEuropeanDate(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseEuropeanDate('')).toBeNull()
  })

  it('returns null for invalid format', () => {
    expect(parseEuropeanDate('not-a-date')).toBeNull()
  })
})

// ─── ageInMonthsAt ────────────────────────────────────────────────────────────

describe('ageInMonthsAt', () => {
  it('calculates exactly 12 months', () => {
    const birth = new Date(2024, 0, 1)  // Jan 1 2024
    const ref = new Date(2025, 0, 1)    // Jan 1 2025
    expect(ageInMonthsAt(birth, ref)).toBe(12)
  })

  it('calculates 0 months on exact birthday', () => {
    const birth = new Date(2024, 5, 15)
    expect(ageInMonthsAt(birth, birth)).toBe(0)
  })

  it('subtracts 1 month if ref day < birth day', () => {
    const birth = new Date(2024, 0, 20) // Jan 20
    const ref = new Date(2024, 1, 10)   // Feb 10 (day 10 < day 20)
    expect(ageInMonthsAt(birth, ref)).toBe(0)
  })

  it('does not subtract when ref day >= birth day', () => {
    const birth = new Date(2024, 0, 10) // Jan 10
    const ref = new Date(2024, 1, 15)   // Feb 15 (day 15 >= day 10)
    expect(ageInMonthsAt(birth, ref)).toBe(1)
  })

  it('returns null when birthDate is null', () => {
    expect(ageInMonthsAt(null, new Date())).toBeNull()
  })

  it('returns null when refDate is null', () => {
    expect(ageInMonthsAt(new Date(), null)).toBeNull()
  })
})

// ─── calculateGroupOrAgeStatus ────────────────────────────────────────────────

describe('calculateGroupOrAgeStatus', () => {
  it('matches child to תינוקות group (7 months old)', () => {
    const ref = new Date(2026, 0, 1)
    const birth = new Date(2025, 5, 1)  // ~7 months before ref
    const dob = `01/06/2025`
    const result = calculateGroupOrAgeStatus(dob, ref, DEFAULT_GROUPS)
    expect(result?.status).toBe('match')
    expect(result?.name).toBe('תינוקות')
  })

  it('matches child to פעוטות group (~13 months old)', () => {
    const ref = new Date(2026, 2, 1)  // Mar 2026
    const dob = '01/02/2025'          // Feb 2025 → ~13 months
    const result = calculateGroupOrAgeStatus(dob, ref, DEFAULT_GROUPS)
    expect(result?.status).toBe('match')
    expect(result?.name).toBe('פעוטות')
  })

  it('returns tooSmall for infant <5 months', () => {
    const ref = new Date(2026, 0, 1)
    const dob = '01/10/2025'  // ~3 months at ref
    const result = calculateGroupOrAgeStatus(dob, ref, DEFAULT_GROUPS)
    expect(result?.status).toBe('tooSmall')
  })

  it('returns tooBig for child >30 months', () => {
    const ref = new Date(2026, 0, 1)
    const dob = '01/01/2023'  // ~36 months at ref
    const result = calculateGroupOrAgeStatus(dob, ref, DEFAULT_GROUPS)
    expect(result?.status).toBe('tooBig')
  })

  it('returns null for empty dob', () => {
    expect(calculateGroupOrAgeStatus('', new Date(), DEFAULT_GROUPS)).toBeNull()
  })

  it('returns null for empty groups', () => {
    expect(calculateGroupOrAgeStatus('01/01/2025', new Date(), [])).toBeNull()
  })

  it('returns null for null groups', () => {
    expect(calculateGroupOrAgeStatus('01/01/2025', new Date(), null)).toBeNull()
  })
})

// ─── config ───────────────────────────────────────────────────────────────────

describe('config', () => {
  it('workHours.min is 7 by default', () => {
    expect(config.workHours.min).toBe(7)
  })

  it('workHours.max is 17 by default', () => {
    expect(config.workHours.max).toBe(17)
  })

  it('referenceDate is Sept 1 2026 by default', () => {
    expect(config.referenceDate.year).toBe(2026)
    expect(config.referenceDate.month).toBe(8) // Sept (0-indexed)
    expect(config.referenceDate.day).toBe(1)
  })

  it('defaultAgeGroups has 3 groups', () => {
    expect(config.defaultAgeGroups).toHaveLength(3)
  })

  it('all default groups have required fields', () => {
    for (const g of config.defaultAgeGroups) {
      expect(g).toHaveProperty('id')
      expect(g).toHaveProperty('name')
      expect(g).toHaveProperty('minAge')
      expect(g).toHaveProperty('maxAge')
      expect(g).toHaveProperty('maxCapacity')
      expect(g).toHaveProperty('ratio')
      expect(g).toHaveProperty('staffingMin')
      expect(g).toHaveProperty('staffingOptimal')
    }
  })

  it('staffingMin and staffingOptimal always have cook:0', () => {
    for (const g of config.defaultAgeGroups) {
      expect(g.staffingMin.cook).toBe(0)
      expect(g.staffingOptimal.cook).toBe(0)
    }
  })

  it('age groups are non-overlapping (maxAge < next minAge)', () => {
    const sorted = [...config.defaultAgeGroups].sort((a, b) => a.minAge - b.minAge)
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].maxAge).toBeLessThan(sorted[i + 1].minAge)
    }
  })

  it('getReferenceDate returns correct Date instance', () => {
    const ref = getReferenceDate()
    expect(ref).toBeInstanceOf(Date)
    expect(ref.getFullYear()).toBe(2026)
    expect(ref.getMonth()).toBe(8)
    expect(ref.getDate()).toBe(1)
  })

  it('defaultStaffing has cook:0', () => {
    expect(config.defaultStaffing.min.cook).toBe(0)
    expect(config.defaultStaffing.optimal.cook).toBe(0)
  })

  it('defaultStaffing.optimal.lead >= defaultStaffing.min.lead', () => {
    expect(config.defaultStaffing.optimal.lead).toBeGreaterThanOrEqual(config.defaultStaffing.min.lead)
  })
})
