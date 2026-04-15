/**
 * GET /api/data
 * Returns all teams and health checks.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readData } from './_store'

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const data = await readData()
    res.status(200).json(data)
  } catch (error) {
    console.error('[GET /api/data]', error)
    res.status(500).json({ error: 'Failed to load data' })
  }
}

