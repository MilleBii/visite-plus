import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://lbksiotvnnpqkwslwjoq.supabase.co'
const supabaseAnonKey = 'sb_publishable_PHQ48k3UcTbs4ATRQWpwQw_B21GhzKO'

export const supabase = createClient(SUPABASE_URL, supabaseAnonKey)
