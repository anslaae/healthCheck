import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  pkceChallengeFromVerifier,
  randomCodeVerifier,
  randomState,
  resolveAppOrigin,
  safeReturnTo,
  setOAuthCookie,
} from '../_session.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    res.status(500).json({ error: 'GITHUB_CLIENT_ID is not configured' })
    return
  }

  const appOrigin = resolveAppOrigin(req)
  const redirectUri = `${appOrigin}/api/auth/github/callback`
  const state = randomState()
  const codeVerifier = randomCodeVerifier()
  const codeChallenge = pkceChallengeFromVerifier(codeVerifier)
  const returnTo = safeReturnTo(req.query.returnTo)

  setOAuthCookie(res, {
    state,
    codeVerifier,
    returnTo,
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'read:user user:email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    allow_signup: 'true',
  })

  res.redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`)
}

