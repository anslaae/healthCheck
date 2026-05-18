/**
 * POST /api/health-checks  – create a new health check
 * DELETE /api/health-checks – delete a health check (only when it has no votes)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { canManagePrivateTeam, getAuthSession } from './_authz.js'
import { readData, writeData } from './_store.js'
import type { HealthCheck } from './_store.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'POST') {
    const check = req.body as HealthCheck

    if (!check?.id || !check?.teamId || !check?.name) {
      res.status(400).json({ error: 'Invalid health check payload' })
      return
    }

    try {
      const session = await getAuthSession(req)
      const data = await readData()
      const team = data.teams.find((t) => t.id === check.teamId)

      if (!team) {
        res.status(404).json({ error: 'Team not found' })
        return
      }

      if (!canManagePrivateTeam(team, session)) {
        res.status(403).json({ error: 'Only private team members can create health checks' })
        return
      }

      data.healthChecks.push(check)
      await writeData(data)
      res.status(201).json({ success: true })
    } catch (error) {
      console.error('[POST /api/health-checks]', error)
      res.status(500).json({ error: 'Failed to create health check' })
    }
    return
  }

  if (req.method === 'DELETE') {
    const { checkId } = req.body as { checkId?: string }

    if (!checkId) {
      res.status(400).json({ error: 'checkId is required' })
      return
    }

    try {
      const session = await getAuthSession(req)
      const data = await readData()
      const check = data.healthChecks.find((c) => c.id === checkId)

      if (!check) {
        res.status(404).json({ error: 'Health check not found' })
        return
      }

      const team = data.teams.find((t) => t.id === check.teamId)
      if (!team) {
        res.status(404).json({ error: 'Team not found' })
        return
      }

      if (!canManagePrivateTeam(team, session)) {
        res.status(403).json({ error: 'Only private team members can delete health checks' })
        return
      }

      if (check.votes.length > 0) {
        res.status(400).json({ error: 'Cannot delete a health check that has responses' })
        return
      }

      data.healthChecks = data.healthChecks.filter((c) => c.id !== checkId)
      await writeData(data)
      res.status(200).json({ success: true })
    } catch (error) {
      console.error('[DELETE /api/health-checks]', error)
      res.status(500).json({ error: 'Failed to delete health check' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
