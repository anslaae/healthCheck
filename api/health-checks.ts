/**
 * POST /api/health-checks – create a new health check
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readData, writeData } from './_store.js'
import type { HealthCheck } from './_store.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const check = req.body as HealthCheck

  if (!check?.id || !check?.teamId || !check?.name) {
    res.status(400).json({ error: 'Invalid health check payload' })
    return
  }

  try {
    const data = await readData()

    if (!data.teams.some((t) => t.id === check.teamId)) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    data.healthChecks.push(check)
    await writeData(data)
    res.status(201).json({ success: true })
  } catch (error) {
    console.error('[POST /api/health-checks]', error)
    res.status(500).json({ error: 'Failed to create health check' })
  }
}
