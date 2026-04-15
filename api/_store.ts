/**
 * api/_store.ts
 *
 * Blob storage logic and seed data for the health-check API.
 * All data lives in a single JSON blob: healthcheck/app-data.json
 */

import { put, get } from '@vercel/blob'

// ---------------------------------------------------------------------------
// Types (duplicated here to keep the API self-contained and Node-safe)
// ---------------------------------------------------------------------------

export type VoteType = 'happy' | 'ok' | 'unhappy'

export interface Question {
  id: string
  text: string
  order: number
  happyExplanation?: string
  unhappyExplanation?: string
}

export interface Vote {
  questionId: string
  vote: VoteType
  timestamp: number
}

export interface HealthCheck {
  id: string
  teamId: string
  name: string
  questions: Question[]
  createdAt: number
  status: 'active' | 'closed'
  votes: Vote[]
}

export interface Team {
  id: string
  name: string
  createdAt: number
}

export type AppData = {
  teams: Team[]
  healthChecks: HealthCheck[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15)
}

function randomQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function randomVote(): VoteType {
  const roll = Math.random()
  if (roll < 0.55) return 'happy'
  if (roll < 0.82) return 'ok'
  return 'unhappy'
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const DEFAULT_QUESTIONS = [
  {
    question: 'Do we deliver valuable work that we are proud of and that makes our stakeholders happy?',
    happy: 'We feel our work clearly matters, delivers real impact, and is appreciated by users and stakeholders.',
    unhappy: "We don't see the impact of our work, or we feel we are delivering things that don't really matter.",
  },
  {
    question: 'Is releasing our software simple, safe, and mostly automated?',
    happy: 'Releases are routine, low-stress, and something the team can do frequently and confidently.',
    unhappy: 'Releases are painful, risky, infrequent, or require lots of manual steps and coordination.',
  },
  {
    question: 'Does our way of working fit us well and help us do our job effectively?',
    happy: 'Our processes feel helpful rather than restrictive and support how we actually work.',
    unhappy: 'Processes feel heavy, unclear, or imposed, and often get in the way of getting work done.',
  },
  {
    question: 'Is our codebase clean, easy to work with, well tested, and under control?',
    happy: 'The code is understandable, maintainable, and enables us to move forward confidently.',
    unhappy: 'Technical debt, poor tests, or fragile code slow us down and create stress.',
  },
  {
    question: 'Are we able to get things done quickly without unnecessary delays or blockers?',
    happy: 'We move from idea to production at a good pace and can respond quickly when needed.',
    unhappy: 'Work gets stuck, decisions take too long, or external dependencies constantly block progress.',
  },
  {
    question: 'Do we clearly understand why we are here and feel motivated by our mission?',
    happy: 'The team has a shared sense of purpose and understands how our work fits into the bigger picture.',
    unhappy: 'Our mission feels unclear, uninspiring, or disconnected from what we do day to day.',
  },
  {
    question: 'Do we enjoy going to work and have fun working together as a team?',
    happy: 'The team environment is positive, collaborative, and enjoyable.',
    unhappy: 'Work feels draining, tense, or joyless, even when things are going well technically.',
  },
  {
    question: 'Do we have enough time and opportunity to learn and improve continuously?',
    happy: 'We regularly grow our skills and improve how we work.',
    unhappy: 'There is no time to learn, reflect, or improve, and we are stuck in delivery mode.',
  },
  {
    question: 'Do we get the support and help we need when we ask for it?',
    happy: 'We feel supported by leadership, stakeholders, and other teams.',
    unhappy: 'We feel left alone, unheard, or unable to get help when it matters.',
  },
  {
    question: 'Do we feel in control of what we build and how we build it?',
    happy: 'We have autonomy and influence over decisions that affect our work.',
    unhappy: 'We feel like order-takers with little say in priorities, solutions, or direction.',
  },
]

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
]

type VoteSummaryRow = { question: number; happy: number; ok: number; unhappy: number }

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

function createQuestions(): Question[] {
  return DEFAULT_QUESTIONS.map((q, index) => ({
    id: randomQuestionId(),
    text: q.question,
    order: index,
    happyExplanation: q.happy,
    unhappyExplanation: q.unhappy,
  }))
}

function createVotes(questions: Question[], participants: number, baseTime: number): Vote[] {
  const votes: Vote[] = []
  for (let participant = 0; participant < participants; participant++) {
    for (let i = 0; i < questions.length; i++) {
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
  return PI_QUESTION_SEED.map((q, index) => ({
    id: `pi-q-${index + 1}`,
    text: q.text,
    order: q.order,
    happyExplanation: q.happyExplanation,
    unhappyExplanation: q.unhappyExplanation,
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
      for (let i = 0; i < count; i++) {
        votes.push({ questionId: question.id, vote, timestamp: baseTime + timeOffset })
        timeOffset++
      }
    }
    pushVotes(row.happy, 'happy')
    pushVotes(row.ok, 'ok')
    pushVotes(row.unhappy, 'unhappy')
  }
  return votes
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

  return { teams, healthChecks: checks }
}

function mergeSeedData(existing: AppData, seeded: AppData): AppData {
  const teams = [...existing.teams]
  const healthChecks = [...existing.healthChecks]

  for (const team of seeded.teams) {
    if (!teams.some((t) => t.id === team.id)) {
      teams.push(team)
    }
  }

  for (const check of seeded.healthChecks) {
    const existingIndex = healthChecks.findIndex((c) => c.id === check.id)
    if (existingIndex === -1) {
      healthChecks.push(check)
      continue
    }
    // Keep the seeded PI check current when seed content changes.
    if (check.id === PI_CHECK_ID) {
      healthChecks[existingIndex] = check
    }
  }

  return { teams, healthChecks }
}

// ---------------------------------------------------------------------------
// Blob storage
// ---------------------------------------------------------------------------

const BLOB_PATHNAME = 'healthcheck/app-data.json'

export async function readData(): Promise<AppData> {
  const result = await get(BLOB_PATHNAME, { access: 'private', useCache: false })

  if (!result) {
    // Blob doesn't exist yet — seed and persist
    const seeded = buildSeedData()
    await writeData(seeded)
    return seeded
  }

  const existing = (await new Response(result.stream).json()) as AppData

  if (!Array.isArray(existing.teams) || !Array.isArray(existing.healthChecks)) {
    const seeded = buildSeedData()
    await writeData(seeded)
    return seeded
  }

  const seeded = buildSeedData()
  const merged = mergeSeedData(existing, seeded)

  const needsUpdate =
    merged.teams.length !== existing.teams.length ||
    merged.healthChecks.length !== existing.healthChecks.length ||
    JSON.stringify(merged.healthChecks.find((c) => c.id === PI_CHECK_ID)) !==
      JSON.stringify(existing.healthChecks.find((c) => c.id === PI_CHECK_ID))

  if (needsUpdate) {
    await writeData(merged)
    return merged
  }

  return existing
}

export async function writeData(data: AppData): Promise<void> {
  await put(BLOB_PATHNAME, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

export { randomId as generateId }

