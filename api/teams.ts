/**
 * POST /api/teams        – create a team (login required)
 * PATCH /api/teams       – update team visibility (login required for private)
 * DELETE /api/teams      – delete a team with no health checks (body: { teamId })
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { canManagePrivateTeam, getAuthSession } from './_authz.js'
import { readData, writeData } from './_store.js'
import { asObject, getStringField, getUnionField } from './_validation.js'
import type { Team } from './_store.js'

type CreateTeamInput = {
  id: string
  name: string
  createdAt: number
  visibility?: 'public' | 'private'
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'POST') {
    const session = await getAuthSession(req)
    if (!session) {
      res.status(401).json({ error: 'You must be logged in to create a team' })
      return
    }

    const input = req.body as CreateTeamInput

    if (!input?.id || !input?.name) {
      res.status(400).json({ error: 'Invalid team payload' })
      return
    }

    const visibility = input.visibility === 'private' ? 'private' : 'public'

    const team: Team = {
      id: input.id,
      name: input.name,
      createdAt: typeof input.createdAt === 'number' ? input.createdAt : Date.now(),
      visibility,
      members:
        visibility === 'private'
          ? [
              {
                userId: session.user.id,
                login: session.user.login,
                name: session.user.name,
                joinedAt: Date.now(),
              },
            ]
          : [],
    }

    try {
      const data = await readData()
      if (data.teams.some((t) => t.id === team.id)) {
        res.status(409).json({ error: 'Team already exists' })
        return
      }
      data.teams.push(team)
      await writeData(data)
      res.status(201).json({ success: true })
    } catch (error) {
      console.error('[POST /api/teams]', error)
      res.status(500).json({ error: 'Failed to create team' })
    }
    return
  }

  if (req.method === 'PATCH') {
    const session = await getAuthSession(req)
    if (!session) {
      res.status(401).json({ error: 'You must be logged in to update team privacy' })
      return
    }

    const body = asObject(req.body)
    const teamId = getStringField(body, 'teamId')
    const visibility = getUnionField(body, 'visibility', ['public', 'private'] as const)

    if (!teamId || (visibility !== 'public' && visibility !== 'private')) {
      res.status(400).json({ error: 'teamId and visibility are required' })
      return
    }

    try {
      const data = await readData()
      const team = data.teams.find((t) => t.id === teamId)

      if (!team) {
        res.status(404).json({ error: 'Team not found' })
        return
      }

      if (!canManagePrivateTeam(team, session)) {
        res.status(403).json({ error: 'Only private team members can change this team' })
        return
      }

      if (visibility === 'private') {
        const isAlreadyMember = team.members.some((member) => member.userId === session.user.id)
        if (!isAlreadyMember) {
          team.members.push({
            userId: session.user.id,
            login: session.user.login,
            name: session.user.name,
            joinedAt: Date.now(),
          })
        }
      }

      team.visibility = visibility

      await writeData(data)
      res.status(200).json({ success: true, team })
    } catch (error) {
      console.error('[PATCH /api/teams]', error)
      res.status(500).json({ error: 'Failed to update team' })
    }
    return
  }

  if (req.method === 'DELETE') {
    const body = asObject(req.body)
    const teamId = getStringField(body, 'teamId')

    if (!teamId) {
      res.status(400).json({ error: 'teamId is required' })
      return
    }

    try {
      const session = await getAuthSession(req)
      const data = await readData()
      const team = data.teams.find((t) => t.id === teamId)

      if (!team) {
        res.status(404).json({ error: 'Team not found' })
        return
      }

      if (!canManagePrivateTeam(team, session)) {
        res.status(403).json({ error: 'Only private team members can delete this team' })
        return
      }

      if (data.healthChecks.some((c) => c.teamId === teamId)) {
        res.status(400).json({ error: 'Cannot delete a team that still has health checks' })
        return
      }

      data.teams = data.teams.filter((t) => t.id !== teamId)
      await writeData(data)
      res.status(200).json({ success: true })
    } catch (error) {
      console.error('[DELETE /api/teams]', error)
      res.status(500).json({ error: 'Failed to delete team' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
