// Storage layer: Supabase (cloud) when configured, else localStorage (local-only)
// Data syncs across devices when using Supabase

import { supabase, isSupabaseEnabled } from './supabase'

const STORAGE_KEYS = {
  CHILDREN: 'olam-katan-children',
  AGE_GROUPS: 'olam-katan-age-groups',
  EMPLOYEES: 'olam-katan-employees',
  SCHEDULE: 'olam-katan-schedule'
}

// In-memory cache (populated by loadAll, updated by saves)
const cache = {
  children: [],
  age_groups: [],
  employees: [],
  schedule: {}
}

function readFromLocalStorage() {
  try {
    const c = localStorage.getItem(STORAGE_KEYS.CHILDREN)
    cache.children = c ? JSON.parse(c) : []
  } catch { cache.children = [] }
  try {
    const a = localStorage.getItem(STORAGE_KEYS.AGE_GROUPS)
    cache.age_groups = a ? JSON.parse(a) : []
  } catch { cache.age_groups = [] }
  try {
    const e = localStorage.getItem(STORAGE_KEYS.EMPLOYEES)
    cache.employees = e ? JSON.parse(e) : []
  } catch { cache.employees = [] }
  try {
    const s = localStorage.getItem(STORAGE_KEYS.SCHEDULE)
    cache.schedule = s ? JSON.parse(s) : {}
  } catch { cache.schedule = {} }
}

function writeToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(cache.children))
    localStorage.setItem(STORAGE_KEYS.AGE_GROUPS, JSON.stringify(cache.age_groups))
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(cache.employees))
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(cache.schedule))
  } catch (e) {
    console.error('Error saving to localStorage:', e)
  }
}

const DATA_KEYS = ['children', 'age_groups', 'employees', 'schedule']

const KEY_TO_STORAGE = { children: STORAGE_KEYS.CHILDREN, age_groups: STORAGE_KEYS.AGE_GROUPS, employees: STORAGE_KEYS.EMPLOYEES, schedule: STORAGE_KEYS.SCHEDULE }

function getLocalValue(key) {
  try {
    const raw = localStorage.getItem(KEY_TO_STORAGE[key])
    return raw ? JSON.parse(raw) : (key === 'schedule' ? {} : [])
  } catch { return key === 'schedule' ? {} : [] }
}

async function loadFromSupabase() {
  const { data, error } = await supabase.from('app_data').select('key, value')
  if (error) throw error
  const rows = data || []
  const cloudKeys = new Set(rows.map(r => r.key))

  if (rows.length === 0) {
    readFromLocalStorage()
    if (cache.children?.length || cache.employees?.length || cache.age_groups?.length || Object.keys(cache.schedule || {}).length) {
      for (const key of DATA_KEYS) {
        const val = key === 'children' ? cache.children : key === 'age_groups' ? cache.age_groups : key === 'employees' ? cache.employees : cache.schedule
        await saveToSupabase(key, val).catch(e => console.error(`Supabase backfill ${key}:`, e))
      }
      writeToLocalStorage()
    }
  } else {
    for (const row of rows) {
      const k = row.key
      if (cache.hasOwnProperty(k)) cache[k] = row.value ?? (k === 'schedule' ? {} : [])
    }
    for (const key of DATA_KEYS) {
      if (!cloudKeys.has(key)) {
        const local = getLocalValue(key)
        if (key === 'children') cache.children = Array.isArray(local) ? local : []
        else if (key === 'age_groups') cache.age_groups = Array.isArray(local) ? local : []
        else if (key === 'employees') cache.employees = Array.isArray(local) ? local : []
        else cache.schedule = local && typeof local === 'object' ? local : {}
        await saveToSupabase(key, cache[key]).catch(e => console.error(`Supabase backfill ${key}:`, e))
        writeToLocalStorage()
      }
    }
  }
  if (!cache.children) cache.children = []
  if (!cache.age_groups) cache.age_groups = []
  if (!cache.employees) cache.employees = []
  if (!cache.schedule) cache.schedule = {}
}

const SAVE_RETRIES = 3

async function saveToSupabase(key, value) {
  let lastErr
  for (let i = 0; i < SAVE_RETRIES; i++) {
    const { error } = await supabase.from('app_data').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    if (!error) return
    lastErr = error
    if (i < SAVE_RETRIES - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)))
  }
  throw lastErr
}

/** Load all data (Supabase if configured, else localStorage). Call once on app init. */
export async function loadAll() {
  if (isSupabaseEnabled()) {
    try {
      await loadFromSupabase()
    } catch (e) {
      console.error('Supabase load failed, falling back to localStorage:', e)
      readFromLocalStorage()
    }
    await syncAllToSupabase()
  } else {
    readFromLocalStorage()
  }
}

/** Push all four keys to Supabase. Ensures no key is ever left behind (fixes asymmetry bug). */
async function syncAllToSupabase() {
  const pairs = [
    ['children', cache.children],
    ['age_groups', cache.age_groups],
    ['employees', cache.employees],
    ['schedule', cache.schedule]
  ]
  for (const [key, val] of pairs) {
    await saveToSupabase(key, val).catch(e => console.error(`Supabase sync ${key}:`, e))
  }
}

// Sync getters (read from cache)
export const getChildren = () => cache.children
export const getAgeGroups = () => cache.age_groups
export const getEmployees = () => cache.employees
export const getSchedule = () => cache.schedule

// Sync setters (update cache + persist to both Supabase and localStorage)
export function saveChildren(children) {
  cache.children = children
  writeToLocalStorage()
  if (isSupabaseEnabled()) {
    saveToSupabase('children', children).catch(e => console.error('Supabase save children:', e))
  }
}

export function saveAgeGroups(ageGroups) {
  cache.age_groups = ageGroups
  writeToLocalStorage()
  if (isSupabaseEnabled()) {
    saveToSupabase('age_groups', ageGroups).catch(e => console.error('Supabase save age_groups:', e))
  }
}

export function saveEmployees(employees) {
  cache.employees = employees
  writeToLocalStorage()
  if (isSupabaseEnabled()) {
    saveToSupabase('employees', employees).catch(e => console.error('Supabase save employees:', e))
  }
}

export function saveSchedule(schedule) {
  cache.schedule = schedule
  writeToLocalStorage()
  if (isSupabaseEnabled()) {
    saveToSupabase('schedule', schedule).catch(e => console.error('Supabase save schedule:', e))
  }
}
