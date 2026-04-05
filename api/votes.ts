/**
 * api/votes.ts
 *
 * POST /api/votes — Submit votes for a health check
 */

import { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseServer } from './supabaseServer'

type Vote = {
  questionId: string
  vote: 'happy' | 'ok' | 'unhappy'
  timestamp: number
}

type SubmitVotesBody = {
  healthCheckId: string
  votes: Vote[]
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as SubmitVotesBody

    if (!body.healthCheckId || !body.votes || body.votes.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { error } = await supabaseServer.from('votes').insert(
      body.votes.map((v) => ({
        health_check_id: body.healthCheckId,
        question_id: v.questionId,
        vote: v.vote,
        created_at: new Date(v.timestamp).toISOString(),
      }))
    )

    if (error) throw error

    res.status(201).json({ success: true })
  } catch (error) {
    console.error('Error submitting votes:', error)
    res.status(500).json({ error: 'Failed to submit votes' })
  }
}

