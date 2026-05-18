/**
 * lib/dataService.ts
 *
 * Thin HTTP client – all persistence is handled by the Vercel API routes
 * which store data in Vercel Blob Storage.
 */

import { HealthCheck, Team, Vote } from './types'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `API error ${res.status}`)
  }

  return res.json() as Promise<T>
}

/** Load all teams and health checks. */
export async function fetchAppData(): Promise<{
  teams: Team[]
  healthChecks: HealthCheck[]
}> {
  return apiFetch('/api/data')
}

/** Create a new team. */
export async function createTeam(team: Team): Promise<void> {
  await apiFetch('/api/teams', {
    method: 'POST',
    body: JSON.stringify(team),
  })
}

/** Set team visibility to public/private. */
export async function updateTeamVisibility(teamId: string, visibility: 'public' | 'private'): Promise<void> {
  await apiFetch('/api/teams', {
    method: 'PATCH',
    body: JSON.stringify({ teamId, visibility }),
  })
}

/** Create a shareable invite link for a private team. */
export async function createPrivateTeamInvite(teamId: string): Promise<{ inviteUrl: string }> {
  return apiFetch('/api/team-members', {
    method: 'POST',
    body: JSON.stringify({ action: 'createInvite', teamId }),
  })
}

/** Join a private team using an invite code. */
export async function joinPrivateTeamByInvite(inviteCode: string): Promise<{ teamId: string; teamName: string }> {
  return apiFetch('/api/team-members', {
    method: 'POST',
    body: JSON.stringify({ action: 'joinByInvite', inviteCode }),
  })
}

/** Create a new health check. */
export async function createHealthCheck(check: HealthCheck): Promise<void> {
  await apiFetch('/api/health-checks', {
    method: 'POST',
    body: JSON.stringify(check),
  })
}

/** Submit votes for a health check. */
export async function submitVotes(healthCheckId: string, votes: Vote[]): Promise<void> {
  await apiFetch('/api/votes', {
    method: 'POST',
    body: JSON.stringify({ healthCheckId, votes }),
  })
}

/** Close a health check. */
export async function closeHealthCheck(checkId: string): Promise<void> {
  await apiFetch('/api/close', {
    method: 'POST',
    body: JSON.stringify({ checkId }),
  })
}

/** Delete a health check (only allowed when it has no votes). */
export async function deleteHealthCheck(checkId: string): Promise<void> {
  await apiFetch('/api/health-checks', {
    method: 'DELETE',
    body: JSON.stringify({ checkId }),
  })
}

/** Delete a team when it has no health checks. */
export async function deleteTeam(teamId: string): Promise<void> {
  await apiFetch('/api/teams', {
    method: 'DELETE',
    body: JSON.stringify({ teamId }),
  })
}
