/**
 * GET /api/data
 * Returns all teams and health checks.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { canViewTeam, getAuthSession } from './_authz.js'
import { readData } from './_store.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const session = await getAuthSession(req)
    const data = await readData()
    const visibleTeams = data.teams.filter((team) => canViewTeam(team, session))
    const visibleTeamIds = new Set(visibleTeams.map((team) => team.id))
    const visibleChecks = data.healthChecks.filter((check) => visibleTeamIds.has(check.teamId))

    res.status(200).json({
      teams: visibleTeams,
      healthChecks: visibleChecks,
    })
  } catch (error) {
    console.error('[GET /api/data]', error)
    res.status(500).json({ error: 'Failed to load data' })
  }
}
