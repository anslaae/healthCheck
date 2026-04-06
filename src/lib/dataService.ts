/**
 * lib/dataService.ts
 *
 * Frontend data layer – all calls go through `/api/*` endpoints.
 * No direct Supabase access from the browser.
 */

import { HealthCheck, Team, Vote } from './types'

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// ── Public API ────────────────────────────────────────────────────────────────

/** Load all teams and health checks. */
export async function fetchAppData(): Promise<{
  teams: Team[]
  healthChecks: HealthCheck[]
}> {
  const response = await fetch(`${API_BASE_URL}/api/data`)

  if (!response.ok) {
    throw new Error(`Failed to fetch app data: ${response.statusText}`)
  }

  return response.json()
}

/** Create a new team. */
export async function createTeam(team: Team): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: team.id,
      name: team.name,
      createdAt: team.createdAt,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create team: ${response.statusText}`)
  }
}

/** Create a new health check. */
export async function createHealthCheck(check: HealthCheck): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/health-checks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: check.id,
      teamId: check.teamId,
      name: check.name,
      status: check.status,
      questions: check.questions,
      createdAt: check.createdAt,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create health check: ${response.statusText}`)
  }
}

/** Submit votes for a health check. */
export async function submitVotes(
  healthCheckId: string,
  votes: Vote[]
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      healthCheckId,
      votes,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to submit votes: ${response.statusText}`)
  }
}

/** Close a health check. */
export async function closeHealthCheck(checkId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/health-checks?id=${checkId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to close health check: ${response.statusText}`)
  }
}

/** Delete a team (cascades to health checks and votes). */
export async function deleteTeamWithChecks(teamId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to delete team: ${response.statusText}`)
  }
}

