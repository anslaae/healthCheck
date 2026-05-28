import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthSession, isTeamMember } from './_authz.js'
import { resolveAppOrigin } from './auth/_session.js'
import { readData, writeData } from './_store.js'

function generateInviteCode(): string {
  return randomBytes(18).toString('base64url')
}

type CreateInviteBody = {
  action: 'createInvite'
  teamId?: string
}

type JoinInviteBody = {
  action: 'joinByInvite'
  inviteCode?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const session = await getAuthSession(req)
  if (!session) {
    res.status(401).json({ error: 'You must be logged in' })
    return
  }

  const body = req.body as CreateInviteBody | JoinInviteBody

  if (body.action === 'createInvite') {
    const { teamId } = body

    if (!teamId) {
      res.status(400).json({ error: 'teamId is required' })
      return
    }

    try {
      const data = await readData()
      const team = data.teams.find((t) => t.id === teamId)

      if (!team) {
        res.status(404).json({ error: 'Team not found' })
        return
      }

      if (team.visibility !== 'private') {
        res.status(400).json({ error: 'Invites are only available for private teams' })
        return
      }

      if (!isTeamMember(team, session.user.id)) {
        res.status(403).json({ error: 'Only private team members can create invite links' })
        return
      }

      team.inviteCode = generateInviteCode()
      await writeData(data)

      const inviteUrl = `${resolveAppOrigin(req)}/?invite=${encodeURIComponent(team.inviteCode)}`

      res.status(200).json({ success: true, inviteCode: team.inviteCode, inviteUrl })
    } catch (error) {
      console.error('[POST /api/team-members action=createInvite]', error)
      res.status(500).json({ error: 'Failed to create invite link' })
    }
    return
  }

  if (body.action === 'joinByInvite') {
    const { inviteCode } = body

    if (!inviteCode) {
      res.status(400).json({ error: 'inviteCode is required' })
      return
    }

    try {
      const data = await readData()
      const team = data.teams.find((t) => t.visibility === 'private' && t.inviteCode === inviteCode)

      if (!team) {
        res.status(404).json({ error: 'Invite link is invalid or expired' })
        return
      }

      const alreadyMember = isTeamMember(team, session.user.id)

      if (!alreadyMember) {
        team.members.push({
          userId: session.user.id,
          login: session.user.login,
          name: session.user.name,
          joinedAt: Date.now(),
        })

        await writeData(data)
      }

      res.status(200).json({ success: true, teamId: team.id, teamName: team.name, alreadyMember })
    } catch (error) {
      console.error('[POST /api/team-members action=joinByInvite]', error)
      res.status(500).json({ error: 'Failed to join team from invite link' })
    }
    return
  }

  res.status(400).json({ error: 'Unsupported action' })
}


