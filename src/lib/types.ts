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

export interface VoteResult {
  questionId: string
  questionText: string
  happy: number
  ok: number
  unhappy: number
  total: number
}

export interface TrendData {
  direction: 'up' | 'down' | 'flat' | 'none'
  percentageChange: number
  changeFromLast: number
  historicalScores: number[]
}

export interface QuestionResult extends VoteResult {
  trend: TrendData
  happyExplanation?: string
  unhappyExplanation?: string
}
