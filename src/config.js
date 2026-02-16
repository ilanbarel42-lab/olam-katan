/**
 * Application configuration.
 * Defaults can be overridden via environment variables (VITE_*).
 * See .env.example for available options.
 */

const parseNum = (val, fallback) => {
  if (val == null || val === '') return fallback
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

export const config = {
  /** Working hours for employees (decimal hours, e.g. 7 = 7:00, 17 = 17:00) */
  workHours: {
    min: parseNum(import.meta.env.VITE_WORK_HOURS_MIN, 7),
    max: parseNum(import.meta.env.VITE_WORK_HOURS_MAX, 17)
  },

  /** Reference date for age calculations (Expected Entry, group recommendations). Month 0-indexed. */
  referenceDate: {
    year: parseNum(import.meta.env.VITE_REFERENCE_DATE_YEAR, 2026),
    month: parseNum(import.meta.env.VITE_REFERENCE_DATE_MONTH, 8),
    day: parseNum(import.meta.env.VITE_REFERENCE_DATE_DAY, 1)
  },

  /** Default age groups when none exist (Settings tab can modify) */
  defaultAgeGroups: [
    { id: '1', name: 'תינוקות', minAge: 5, maxAge: 10, label: '5-10 חודשים', maxCapacity: 10, ratio: 4, staffingMin: { lead: 1, assistant: 1, cook: 0 }, staffingOptimal: { lead: 2, assistant: 2, cook: 0 } },
    { id: '2', name: 'פעוטות', minAge: 11, maxAge: 15, label: '11-15 חודשים', maxCapacity: 12, ratio: 6, staffingMin: { lead: 1, assistant: 1, cook: 0 }, staffingOptimal: { lead: 2, assistant: 2, cook: 0 } },
    { id: '3', name: 'גנים', minAge: 18, maxAge: 30, label: '18-30 חודשים', maxCapacity: 15, ratio: 8, staffingMin: { lead: 1, assistant: 2, cook: 0 }, staffingOptimal: { lead: 2, assistant: 3, cook: 0 } }
  ],

  /** Staffing defaults when migrating age groups */
  defaultStaffing: {
    min: { lead: 1, assistant: 1, cook: 0 },
    optimal: { lead: 2, assistant: 2, cook: 0 }
  }
}

/** Get reference date as Date instance */
export const getReferenceDate = () =>
  new Date(config.referenceDate.year, config.referenceDate.month, config.referenceDate.day)
