/**
 * api/data.ts
 *
 * GET /api/data
 *
 * Fetch all teams and health checks (with embedded questions) + votes.
 * No auth required in pass 1.
 */

import { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseServer } from './supabaseServer'

type DbTeam = {
  id: string
  name: string
  created_at: string
}

type DbHealthCheck = {
  id: string
  team_id: string
  name: string
  status: 'active' | 'closed'
  questions: Array<{
    id: string
    text: string
    order: number
    happyExplanation?: string
    unhappyExplanation?: string
  }>
  created_at: string
}

type DbVote = {
  health_check_id: string
  question_id: string
  vote: 'happy' | 'ok' | 'unhappy'
  created_at: string
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const [
      { data: teamsData, error: teamsError },
      { data: checksData, error: checksError },
      { data: votesData, error: votesError },
    ] = await Promise.all([
      supabaseServer
        .from('teams')
        .select('id, name, created_at')
        .order('created_at', { ascending: true }),
      supabaseServer
        .from('health_checks')
        .select('id, team_id, name, status, questions, created_at')
        .order('created_at', { ascending: true }),
      supabaseServer
        .from('votes')
        .select('health_check_id, question_id, vote, created_at'),
    ])

    if (teamsError) throw teamsError
    if (checksError) throw checksError
    if (votesError) throw votesError

    // Group votes by health_check_id
    const votesByCheck = new Map<string, DbVote[]>()
    for (const vote of (votesData as DbVote[] | null) ?? []) {
      const bucket = votesByCheck.get(vote.health_check_id)
      if (bucket) bucket.push(vote)
      else votesByCheck.set(vote.health_check_id, [vote])
    }

    // Map to frontend types
    const teams = ((teamsData as DbTeam[] | null) ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: new Date(t.created_at).getTime(),
    }))

    const healthChecks = ((checksData as DbHealthCheck[] | null) ?? []).map(
      (check) => ({
        id: check.id,
        teamId: check.team_id,
        name: check.name,
        status: check.status,
        createdAt: new Date(check.created_at).getTime(),
        questions: (check.questions ?? []).sort((a, b) => a.order - b.order),
        votes: (votesByCheck.get(check.id) ?? []).map((v) => ({
          questionId: v.question_id,
          vote: v.vote,
          timestamp: new Date(v.created_at).getTime(),
        })),
      })
    )

    res.status(200).json({ teams, healthChecks })
  } catch (error) {
    console.error('Error fetching app data:', error)
    res.status(500).json({ error: 'Failed to fetch data' })
  }
}

