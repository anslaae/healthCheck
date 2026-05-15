import { AuthSessionResponse } from './types'

export async function fetchAuthSession(): Promise<AuthSessionResponse> {
  const res = await fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error(`Failed to load auth session (${res.status})`)
  }

  return res.json() as Promise<AuthSessionResponse>
}

export function loginWithGithub(returnTo?: string): void {
  const params = new URLSearchParams()
  if (returnTo) {
    params.set('returnTo', returnTo)
  }

  const query = params.toString()
  const url = query ? `/api/auth/github/login?${query}` : '/api/auth/github/login'
  window.location.href = url
}

export async function logout(): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'fetch' },
  })

  if (!res.ok) {
    throw new Error('Failed to sign out')
  }
}

