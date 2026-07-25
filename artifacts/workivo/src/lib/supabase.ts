import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://taslilfzcbytdlepbfuf.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhc2xpbGZ6Y2J5dGRsZXBiZnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4Mjk5NzksImV4cCI6MjEwMDQwNTk3OX0.IPa2whdItIlWRzebsBK-wZwAmUCPzEV7MW8I0ZEA6dk"

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
