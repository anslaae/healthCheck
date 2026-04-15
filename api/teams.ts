/**
 * POST /api/teams        – create a team
 * DELETE /api/teams      – delete a team and all its health checks (body: { teamId })
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readData, writeData } from './_store.js'
import type { Team } from './_store.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'POST') {
    const team = req.body as Team

    if (!team?.id || !team?.name) {
      res.status(400).json({ error: 'Invalid team payload' })
      return
    }

    try {
      const data = await readData()
      if (data.teams.some((t) => t.id === team.id)) {
        res.status(409).json({ error: 'Team already exists' })
        return
      }
      data.teams.push(team)
      await writeData(data)
      res.status(201).json({ success: true })
    } catch (error) {
      console.error('[POST /api/teams]', error)
      res.status(500).json({ error: 'Failed to create team' })
    }
    return
  }

  if (req.method === 'DELETE') {
    const { teamId } = req.body as { teamId: string }

    if (!teamId) {
      res.status(400).json({ error: 'teamId is required' })
      return
    }

    try {
      const data = await readData()
      data.teams = data.teams.filter((t) => t.id !== teamId)
      data.healthChecks = data.healthChecks.filter((c) => c.teamId !== teamId)
      await writeData(data)
      res.status(200).json({ success: true })
    } catch (error) {
      console.error('[DELETE /api/teams]', error)
      res.status(500).json({ error: 'Failed to delete team' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
