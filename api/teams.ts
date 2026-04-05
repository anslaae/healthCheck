/**
 * api/teams.ts
 *
 * POST /api/teams — Create a new team
 */

import { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseServer } from './supabaseServer'

type CreateTeamBody = {
  id: string
  name: string
  createdAt: number
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as CreateTeamBody

    if (!body.id || !body.name || !body.createdAt) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { error } = await supabaseServer.from('teams').insert({
      id: body.id,
      name: body.name,
      created_at: new Date(body.createdAt).toISOString(),
    })

    if (error) throw error

    res.status(201).json({ success: true })
  } catch (error) {
    console.error('Error creating team:', error)
    res.status(500).json({ error: 'Failed to create team' })
  }
}

