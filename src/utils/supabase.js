// Supabase client for cloud storage
// Only initialized when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const isSupabaseEnabled = () => !!supabase
