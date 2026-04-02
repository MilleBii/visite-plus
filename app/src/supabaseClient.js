// Configuration Supabase pour React
import { createClient } from '@supabase/supabase-js'

// Remplace par tes propres valeurs
const supabaseUrl = 'https://lbksiotvnnpqkwslwjoq.supabase.co'
const supabaseAnonKey = 'sb_publishable_PHQ48k3UcTbs4ATRQWpwQw_B21GhzKO'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
