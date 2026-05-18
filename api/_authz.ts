import type { VercelRequest } from '@vercel/node'
import { getSessionCookie, type AuthSessionPayload } from './auth/_session.js'
import type { Team } from './_store.js'

export async function getAuthSession(req: VercelRequest): Promise<AuthSessionPayload | null> {
  return getSessionCookie(req)
}

export function isTeamMember(team: Team, userId: string): boolean {
  return team.members.some((member) => member.userId === userId)
}

export function canViewTeam(team: Team, session: AuthSessionPayload | null): boolean {
  if (team.visibility === 'public') {
    return true
  }

  if (!session) {
    return false
  }

  return isTeamMember(team, session.user.id)
}

export function canManagePrivateTeam(team: Team, session: AuthSessionPayload | null): boolean {
  if (team.visibility !== 'private') {
    return true
  }

  if (!session) {
    return false
  }

  return isTeamMember(team, session.user.id)
}

