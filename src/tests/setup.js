/**
 * Vitest sandbox setup.
 * - Clears localStorage before every test → no cross-test contamination
 * - Supabase env vars are empty → app runs in localStorage-only mode
 * - No production data is read or written
 */
import { beforeEach, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
})

// Ensure Supabase is always disabled in tests (belt + suspenders)
vi.mock('../utils/supabase', () => ({
  supabase: null,
  isSupabaseEnabled: () => false
}))
