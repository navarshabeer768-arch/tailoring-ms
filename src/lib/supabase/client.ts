import { createLocalClient } from '@/lib/db/local-client'

// Returns a localStorage-backed client with the same API as the Supabase client.
// To switch to real Supabase: replace this with createBrowserClient from @supabase/ssr
export function createClient() {
  return createLocalClient()
}
