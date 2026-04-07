/**
 * lib/dataService.ts
 *
 * Uses generated mock data persisted in localStorage.
 */

import { DEFAULT_QUESTIONS, generateQuestionId } from './healthCheckUtils'
import { HealthCheck, Question, Team, Vote, VoteType } from './types'

type AppData = {
  teams: Team[]
  healthChecks: HealthCheck[]
}

const STORAGE_KEY = 'healthcheck_ui_mock_data_v1'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function randomVote(): VoteType {
  const roll = Math.random()
  if (roll < 0.55) return 'happy'
  if (roll < 0.82) return 'ok'
  return 'unhappy'
}

function createQuestions(): Question[] {
  return DEFAULT_QUESTIONS.map((q, index) => ({
    id: generateQuestionId(),
    text: q.question,
    order: index,
    happyExplanation: q.happy,
    unhappyExplanation: q.unhappy,
  }))
}

function createVotes(questions: Question[], participants: number, baseTime: number): Vote[] {
  const votes: Vote[] = []

  for (let participant = 0; participant < participants; participant += 1) {
    for (let i = 0; i < questions.length; i += 1) {
      votes.push({
        questionId: questions[i].id,
        vote: randomVote(),
        timestamp: baseTime + participant * 1000 + i,
      })
    }
  }

  return votes
}

function buildSeedData(): AppData {
  const now = Date.now()

  const teams: Team[] = [
    { id: 'team-platform', name: 'Platform Team', createdAt: now - 1000 * 60 * 60 * 24 * 40 },
    { id: 'team-product', name: 'Product Team', createdAt: now - 1000 * 60 * 60 * 24 * 32 },
    { id: 'team-growth', name: 'Growth Team', createdAt: now - 1000 * 60 * 60 * 24 * 20 },
  ]

  const checks: HealthCheck[] = []

  const platformQ1Questions = createQuestions()
  checks.push({
    id: 'check-platform-q1',
    teamId: 'team-platform',
    name: 'Platform - Sprint 1',
    createdAt: now - 1000 * 60 * 60 * 24 * 18,
    status: 'closed',
    questions: platformQ1Questions,
    votes: createVotes(platformQ1Questions, 6, now - 1000 * 60 * 60 * 24 * 18),
  })

  const platformQ2Questions = createQuestions()
  checks.push({
    id: 'check-platform-q2',
    teamId: 'team-platform',
    name: 'Platform - Sprint 2',
    createdAt: now - 1000 * 60 * 60 * 24 * 6,
    status: 'active',
    questions: platformQ2Questions,
    votes: createVotes(platformQ2Questions, 3, now - 1000 * 60 * 60 * 24 * 6),
  })

  const productQuestions = createQuestions()
  checks.push({
    id: 'check-product-q1',
    teamId: 'team-product',
    name: 'Product - Monthly Check',
    createdAt: now - 1000 * 60 * 60 * 24 * 10,
    status: 'closed',
    questions: productQuestions,
    votes: createVotes(productQuestions, 7, now - 1000 * 60 * 60 * 24 * 10),
  })

  return {
    teams,
    healthChecks: checks,
  }
}

function loadData(): AppData {
  const seeded = buildSeedData()

  if (typeof window === 'undefined') {
    return seeded
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }

  try {
    const parsed = JSON.parse(raw) as AppData
    if (!Array.isArray(parsed.teams) || !Array.isArray(parsed.healthChecks)) {
      throw new Error('Invalid mock data shape')
    }
    return parsed
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

function saveData(data: AppData): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

async function withMockLatency(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 80))
}

/** Load all teams and health checks. */
export async function fetchAppData(): Promise<{
  teams: Team[]
  healthChecks: HealthCheck[]
}> {
  await withMockLatency()
  const data = loadData()
  return clone(data)
}

/** Create a new team. */
export async function createTeam(team: Team): Promise<void> {
  await withMockLatency()
  const data = loadData()

  const exists = data.teams.some((t) => t.id === team.id)
  if (exists) {
    throw new Error('Team already exists')
  }

  data.teams.push(team)
  saveData(data)
}

/** Create a new health check. */
export async function createHealthCheck(check: HealthCheck): Promise<void> {
  await withMockLatency()
  const data = loadData()

  const teamExists = data.teams.some((team) => team.id === check.teamId)
  if (!teamExists) {
    throw new Error('Team not found')
  }

  data.healthChecks.push(check)
  saveData(data)
}

/** Submit votes for a health check. */
export async function submitVotes(
  healthCheckId: string,
  votes: Vote[]
): Promise<void> {
  await withMockLatency()
  const data = loadData()

  const check = data.healthChecks.find((item) => item.id === healthCheckId)
  if (!check) {
    throw new Error('Health check not found')
  }

  if (check.status !== 'active') {
    throw new Error('Health check is closed')
  }

  check.votes.push(...votes)
  saveData(data)
}

/** Close a health check. */
export async function closeHealthCheck(checkId: string): Promise<void> {
  await withMockLatency()
  const data = loadData()

  const check = data.healthChecks.find((item) => item.id === checkId)
  if (!check) {
    throw new Error('Health check not found')
  }

  check.status = 'closed'
  saveData(data)
}

/** Delete a team (cascades to health checks and votes). */
export async function deleteTeamWithChecks(teamId: string): Promise<void> {
  await withMockLatency()
  const data = loadData()

  data.teams = data.teams.filter((team) => team.id !== teamId)
  data.healthChecks = data.healthChecks.filter((check) => check.teamId !== teamId)

  saveData(data)
}

