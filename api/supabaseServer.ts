/**
 * api/supabaseServer.ts
 *
 * Server-side Supabase client.
 * Uses SERVICE_ROLE_KEY for admin operations.
 * Only instantiated on the backend — never exposed to the browser.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in serverless environment'
  )
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)

