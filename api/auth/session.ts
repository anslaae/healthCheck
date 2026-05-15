import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSessionCookie } from './_session.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  res.setHeader('Cache-Control', 'no-store')

  const session = await getSessionCookie(req)

  if (!session) {
    res.status(200).json({ authenticated: false })
    return
  }

  res.status(200).json({
    authenticated: true,
    provider: session.provider,
    user: session.user,
    expiresAt: session.expiresAt,
  })
}
