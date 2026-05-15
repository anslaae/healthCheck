import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  clearOAuthCookie,
  clearSessionCookie,
  getOAuthCookie,
  resolveAppOrigin,
  safeReturnTo,
  setSessionCookie,
} from '../_session.js'

interface GithubTokenResponse {
  access_token?: string
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

interface GithubUserResponse {
  id: number
  login: string
  name: string | null
  avatar_url: string | null
}

interface GithubEmailResponse {
  email: string
  primary: boolean
  verified: boolean
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  const oauthCookie = getOAuthCookie(req)

  if (!code || !state || !oauthCookie || oauthCookie.state !== state) {
    clearOAuthCookie(res)
    clearSessionCookie(res)
    res.redirect(302, '/?authError=state_mismatch')
    return
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    clearOAuthCookie(res)
    res.status(500).json({ error: 'GitHub OAuth is not configured' })
    return
  }

  const appOrigin = resolveAppOrigin(req)
  const redirectUri = `${appOrigin}/api/auth/github/callback`

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'health-check-app',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: oauthCookie.codeVerifier,
      }),
    })

    const tokenBody = (await tokenResponse.json()) as GithubTokenResponse

    if (!tokenResponse.ok || !tokenBody.access_token) {
      throw new Error(tokenBody.error_description ?? tokenBody.error ?? 'GitHub token exchange failed')
    }

    const accessToken = tokenBody.access_token

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'health-check-app',
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to fetch GitHub user profile')
    }

    const user = (await userResponse.json()) as GithubUserResponse

    let email: string | undefined
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'health-check-app',
      },
    })

    if (emailResponse.ok) {
      const emails = (await emailResponse.json()) as GithubEmailResponse[]
      const preferredEmail = emails.find((entry) => entry.primary && entry.verified) ?? emails[0]
      email = preferredEmail?.email
    }

    await setSessionCookie(res, {
      provider: 'github',
      user: {
        id: String(user.id),
        login: user.login,
        name: user.name ?? user.login,
        avatarUrl: user.avatar_url ?? undefined,
        email,
      },
    })
    clearOAuthCookie(res)

    const returnTo = safeReturnTo(oauthCookie.returnTo)
    res.redirect(302, returnTo)
  } catch (error) {
    console.error('[GET /api/auth/github/callback]', error)
    clearOAuthCookie(res)
    clearSessionCookie(res)
    res.redirect(302, '/?authError=oauth_failed')
  }
}


