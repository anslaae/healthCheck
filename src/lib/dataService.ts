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

/** Delete a team (cascades to health checks and votes). */
export async function deleteTeamWithChecks(teamId: string): Promise<void> {
  await apiFetch('/api/teams', {
    method: 'DELETE',
    body: JSON.stringify({ teamId }),
  })
}
