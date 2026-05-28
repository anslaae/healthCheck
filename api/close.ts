/**
 * POST /api/close – close a health check
 * Body: { checkId: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { canManagePrivateTeam, getAuthSession } from './_authz.js'
import { readData, writeData } from './_store.js'
import { asObject, getStringField } from './_validation.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = asObject(req.body)
  const checkId = getStringField(body, 'checkId')

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
      res.status(403).json({ error: 'Only private team members can close health checks' })
      return
    }

    check.status = 'closed'
    await writeData(data)
    res.status(200).json({ success: true })
  } catch (error) {
    console.error('[POST /api/close]', error)
    res.status(500).json({ error: 'Failed to close health check' })
  }
}
