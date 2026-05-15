import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clearOAuthCookie, isCsrfSafe, revokeSession } from './_session.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!isCsrfSafe(req)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  await revokeSession(req, res)
  clearOAuthCookie(res)

  res.status(200).json({ success: true })
}
