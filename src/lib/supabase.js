import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eavefhyizomclwmnaxcp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhdmVmaHlpem9tY2x3bW5heGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjU1MDgsImV4cCI6MjA4ODg0MTUwOH0.vzWf0nQd8jQ9x3oaNSNg9Aah1qvEk5U_MrylmBvSwow'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
