/**
 * api/health-checks.ts
 *
 * POST   /api/health-checks — Create a new health check
 * PATCH  /api/health-checks?id=... — Update (close) a health check
 * DELETE /api/health-checks?id=... — Delete a health check
 */

import { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseServer } from './supabaseServer'

type Question = {
  id: string
  text: string
  order: number
  happyExplanation?: string
  unhappyExplanation?: string
}

type CreateHealthCheckBody = {
  id: string
  teamId: string
  name: string
  status: 'active' | 'closed'
  questions: Question[]
  createdAt: number
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'POST') {
    return handleCreate(req, res)
  } else if (req.method === 'PATCH') {
    return handleUpdate(req, res)
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleCreate(req: VercelRequest, res: VercelResponse) {
  try {
    const body = req.body as CreateHealthCheckBody

    if (
      !body.id ||
      !body.teamId ||
      !body.name ||
      !body.questions ||
      !body.createdAt
    ) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { error } = await supabaseServer.from('health_checks').insert({
      id: body.id,
      team_id: body.teamId,
      name: body.name,
      status: body.status,
      questions: body.questions,
      created_at: new Date(body.createdAt).toISOString(),
    })

    if (error) throw error

    res.status(201).json({ success: true })
  } catch (error) {
    console.error('Error creating health check:', error)
    res.status(500).json({ error: 'Failed to create health check' })
  }
}

async function handleUpdate(req: VercelRequest, res: VercelResponse) {
  try {
    const checkId = req.query.id as string

    if (!checkId) {
      return res.status(400).json({ error: 'Missing health check id' })
    }

    const { error } = await supabaseServer
      .from('health_checks')
      .update({ status: 'closed' })
      .eq('id', checkId)

    if (error) throw error

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error updating health check:', error)
    res.status(500).json({ error: 'Failed to update health check' })
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  try {
    const checkId = req.query.id as string

    if (!checkId) {
      return res.status(400).json({ error: 'Missing health check id' })
    }

    const { error } = await supabaseServer
      .from('health_checks')
      .delete()
      .eq('id', checkId)

    if (error) throw error

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting health check:', error)
    res.status(500).json({ error: 'Failed to delete health check' })
  }
}

