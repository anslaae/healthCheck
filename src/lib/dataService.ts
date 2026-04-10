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

type VoteSummaryRow = {
  question: number
  happy: number
  ok: number
  unhappy: number
}

const STORAGE_KEY = 'healthcheck_ui_mock_data_v1'

const PI_TEAM_ID = 'team-pi'
const PI_CHECK_ID = 'check-pi-q1'

const PI_QUESTION_SEED = [
  {
    text: 'Do we deliver valuable work that we are proud of and that makes our stakeholders happy?',
    order: 0,
    happyExplanation: 'We feel our work clearly matters, delivers real impact, and is appreciated by users and stakeholders.',
    unhappyExplanation: "We don't see the impact of our work, or we feel we are delivering things that don't really matter.",
  },
  {
    text: 'Is releasing our software simple, safe, and mostly automated?',
    order: 1,
    happyExplanation: 'Releases are routine, low-stress, and something the team can do frequently and confidently.',
    unhappyExplanation: 'Releases are painful, risky, infrequent, or require lots of manual steps and coordination.',
  },
  {
    text: 'Does our way of working fit us well and help us do our job effectively?',
    order: 2,
    happyExplanation: 'Our processes feel helpful rather than restrictive and support how we actually work.',
    unhappyExplanation: 'Processes feel heavy, unclear, or imposed, and often get in the way of getting work done.',
  },
  {
    text: 'Is our codebase clean, easy to work with, well tested, and under control?',
    order: 3,
    happyExplanation: 'The code is understandable, maintainable, and enables us to move forward confidently.',
    unhappyExplanation: 'Technical debt, poor tests, or fragile code slow us down and create stress.',
  },
  {
    text: 'Are we able to get things done quickly without unnecessary delays or blockers?',
    order: 4,
    happyExplanation: 'We move from idea to production at a good pace and can respond quickly when needed.',
    unhappyExplanation: 'Work gets stuck, decisions take too long, or external dependencies constantly block progress.',
  },
  {
    text: 'Do we clearly understand why we are here and feel motivated by our mission?',
    order: 5,
    happyExplanation: 'The team has a shared sense of purpose and understands how our work fits into the bigger picture.',
    unhappyExplanation: 'Our mission feels unclear, uninspiring, or disconnected from what we do day to day.',
  },
  {
    text: 'Do we enjoy going to work and have fun working together as a team?',
    order: 6,
    happyExplanation: 'The team environment is positive, collaborative, and enjoyable.',
    unhappyExplanation: 'Work feels draining, tense, or joyless, even when things are going well technically.',
  },
  {
    text: 'Do we have enough time and opportunity to learn and improve continuously?',
    order: 7,
    happyExplanation: 'We regularly grow our skills and improve how we work.',
    unhappyExplanation: 'There is no time to learn, reflect, or improve, and we are stuck in delivery mode.',
  },
  {
    text: 'Do we get the support and help we need when we ask for it?',
    order: 8,
    happyExplanation: 'We feel supported by leadership, stakeholders, and other teams.',
    unhappyExplanation: 'We feel left alone, unheard, or unable to get help when it matters.',
  },
  {
    text: 'Do we feel in control of what we build and how we build it?',
    order: 9,
    happyExplanation: 'We have autonomy and influence over decisions that affect our work.',
    unhappyExplanation: 'We feel like order-takers with little say in priorities, solutions, or direction.',
  },
] as const

const PI_VOTE_SUMMARY: VoteSummaryRow[] = [
  { question: 1, happy: 3, ok: 3, unhappy: 0 },
  { question: 2, happy: 3, ok: 3, unhappy: 0 },
  { question: 3, happy: 1, ok: 4, unhappy: 0 },
  { question: 4, happy: 4, ok: 1, unhappy: 0 },
  { question: 5, happy: 0, ok: 4, unhappy: 1 },
  { question: 6, happy: 4, ok: 1, unhappy: 0 },
  { question: 7, happy: 5, ok: 1, unhappy: 0 },
  { question: 8, happy: 3, ok: 2, unhappy: 1 },
  { question: 9, happy: 5, ok: 0, unhappy: 0 },
  { question: 10, happy: 2, ok: 3, unhappy: 0 },
]

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

function createPiQuestions(): Question[] {
  return PI_QUESTION_SEED.map((question, index) => ({
    id: `pi-q-${index + 1}`,
    text: question.text,
    order: question.order,
    happyExplanation: question.happyExplanation,
    unhappyExplanation: question.unhappyExplanation,
  }))
}

function createVotesFromSummary(
  questions: Question[],
  summary: VoteSummaryRow[],
  baseTime: number
): Vote[] {
  const votes: Vote[] = []
  let timeOffset = 0

  for (const row of summary) {
    const question = questions[row.question - 1]
    if (!question) continue

    const pushVotes = (count: number, vote: VoteType) => {
      for (let i = 0; i < count; i += 1) {
        votes.push({
          questionId: question.id,
          vote,
          timestamp: baseTime + timeOffset,
        })
        timeOffset += 1
      }
    }

    pushVotes(row.happy, 'happy')
    pushVotes(row.ok, 'ok')
    pushVotes(row.unhappy, 'unhappy')
  }

  return votes
}

function mergeSeedData(existing: AppData, seeded: AppData): AppData {
  const teams = [...existing.teams]
  const healthChecks = [...existing.healthChecks]

  for (const team of seeded.teams) {
    if (!teams.some((existingTeam) => existingTeam.id === team.id)) {
      teams.push(team)
    }
  }

  for (const check of seeded.healthChecks) {
    const existingIndex = healthChecks.findIndex((existingCheck) => existingCheck.id === check.id)

    if (existingIndex === -1) {
      healthChecks.push(check)
      continue
    }

    // Keep seeded PI data current when the app updates seed content.
    if (check.id === PI_CHECK_ID) {
      healthChecks[existingIndex] = check
    }
  }

  return { teams, healthChecks }
}

function buildSeedData(): AppData {
  const now = Date.now()
  const piQuestions = createPiQuestions()

  const teams: Team[] = [
    { id: 'team-platform', name: 'Platform Team', createdAt: now - 1000 * 60 * 60 * 24 * 40 },
    { id: 'team-product', name: 'Product Team', createdAt: now - 1000 * 60 * 60 * 24 * 32 },
    { id: 'team-growth', name: 'Growth Team', createdAt: now - 1000 * 60 * 60 * 24 * 20 },
    { id: PI_TEAM_ID, name: 'PI', createdAt: 1774894800000 },
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

  checks.push({
    id: PI_CHECK_ID,
    teamId: PI_TEAM_ID,
    name: 'PI - Planning Health Check',
    createdAt: 1774895100867,
    status: 'closed',
    questions: piQuestions,
    votes: createVotesFromSummary(piQuestions, PI_VOTE_SUMMARY, 1774895100867),
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
    const merged = mergeSeedData(parsed, seeded)

    if (
      merged.teams.length !== parsed.teams.length ||
      merged.healthChecks.length !== parsed.healthChecks.length
    ) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    }

    return merged
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

