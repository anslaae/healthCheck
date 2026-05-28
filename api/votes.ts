/**
 * POST /api/votes – submit votes for a health check
 * Body: { healthCheckId: string; votes: Vote[] }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { canViewTeam, getAuthSession } from './_authz.js'
import { readData, writeData } from './_store.js'
import type { Vote } from './_store.js'
import { asObject, getStringField, isVote } from './_validation.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = asObject(req.body)
  const healthCheckId = getStringField(body, 'healthCheckId')
  const votes = Array.isArray(body?.votes) ? (body.votes as Vote[]) : undefined

  if (!healthCheckId || !votes) {
    res.status(400).json({ error: 'healthCheckId and votes array are required' })
    return
  }

  const hasInvalidVote = votes.some((vote) => !isVote(vote))

  if (hasInvalidVote) {
    res.status(400).json({ error: 'Invalid vote payload' })
    return
  }

  try {
    const session = await getAuthSession(req)
    const data = await readData()
    const check = data.healthChecks.find((c) => c.id === healthCheckId)

    if (!check) {
      res.status(404).json({ error: 'Health check not found' })
      return
    }

    const team = data.teams.find((t) => t.id === check.teamId)
    if (!team) {
      res.status(404).json({ error: 'Team not found' })
      return
    }

    if (!canViewTeam(team, session)) {
      res.status(403).json({ error: 'Not allowed to vote in this private team' })
      return
    }

    if (check.status !== 'active') {
      res.status(400).json({ error: 'Health check is closed' })
      return
    }

    const validQuestionIds = new Set(check.questions.map((question) => question.id))
    if (votes.some((vote) => !validQuestionIds.has(vote.questionId))) {
      res.status(400).json({ error: 'Votes include unknown question ids' })
      return
    }

    check.votes.push(...votes)
    await writeData(data)
    res.status(200).json({ success: true })
  } catch (error) {
    console.error('[POST /api/votes]', error)
    res.status(500).json({ error: 'Failed to submit votes' })
  }
}
