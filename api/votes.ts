/**
 * POST /api/votes – submit votes for a health check
 * Body: { healthCheckId: string; votes: Vote[] }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readData, writeData } from './_store.js'
import type { Vote } from './_store.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { healthCheckId, votes } = req.body as { healthCheckId: string; votes: Vote[] }

  if (!healthCheckId || !Array.isArray(votes)) {
    res.status(400).json({ error: 'healthCheckId and votes array are required' })
    return
  }

  try {
    const data = await readData()
    const check = data.healthChecks.find((c) => c.id === healthCheckId)

    if (!check) {
      res.status(404).json({ error: 'Health check not found' })
      return
    }

    if (check.status !== 'active') {
      res.status(400).json({ error: 'Health check is closed' })
      return
    }

    check.votes.push(...votes)
    await writeData(data)
    res.status(200).json({ success: true })
  } catch (error) {
    console.error('[POST /api/votes]', error)
    res.status(500).json({ error: 'Failed to submit votes' })
  }
}
