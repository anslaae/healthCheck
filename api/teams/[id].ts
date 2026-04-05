/**
 * api/teams/[id].ts
 *
 * DELETE /api/teams/[id] — Delete a team (cascades to health checks and votes)
 */

import { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseServer } from '../supabaseServer'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const teamId = req.query.id as string

    if (!teamId) {
      return res.status(400).json({ error: 'Missing team id' })
    }

    const { error } = await supabaseServer
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (error) throw error

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting team:', error)
    res.status(500).json({ error: 'Failed to delete team' })
  }
}

