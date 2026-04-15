/**
 * POST /api/close – close a health check
 * Body: { checkId: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readData, writeData } from './_store'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { checkId } = req.body as { checkId: string }

  if (!checkId) {
    res.status(400).json({ error: 'checkId is required' })
    return
  }

  try {
    const data = await readData()
    const check = data.healthChecks.find((c) => c.id === checkId)

    if (!check) {
      res.status(404).json({ error: 'Health check not found' })
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

