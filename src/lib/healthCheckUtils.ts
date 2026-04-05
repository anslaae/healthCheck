import { HealthCheck, VoteResult, TrendData, QuestionResult, VoteType } from './types'

export function calculateVoteResults(healthCheck: HealthCheck): VoteResult[] {
  const results: VoteResult[] = healthCheck.questions.map((question) => {
    const questionVotes = healthCheck.votes.filter((v) => v.questionId === question.id)
    
    const happy = questionVotes.filter((v) => v.vote === 'happy').length
    const ok = questionVotes.filter((v) => v.vote === 'ok').length
    const unhappy = questionVotes.filter((v) => v.vote === 'unhappy').length
    
    return {
      questionId: question.id,
      questionText: question.text,
      happy,
      ok,
      unhappy,
      total: questionVotes.length,
    }
  })
  
  return results
}

export function calculateHappinessScore(result: VoteResult): number {
  if (result.total === 0) return 0
  
  const happyScore = result.happy * 2
  const okScore = result.ok * 1
  const unhappyScore = result.unhappy * 0
  
  return (happyScore + okScore + unhappyScore) / (result.total * 2)
}

export function calculateTrend(
  current: VoteResult,
  allPreviousResults: VoteResult[]
): TrendData {
  const historicalScores = allPreviousResults.map(r => calculateHappinessScore(r))
  const currentScore = calculateHappinessScore(current)
  
  if (allPreviousResults.length === 0 || allPreviousResults.every(r => r.total === 0)) {
    return { 
      direction: 'none', 
      percentageChange: 0,
      changeFromLast: 0,
      historicalScores: []
    }
  }
  
  const lastResult = allPreviousResults[allPreviousResults.length - 1]
  const lastScore = calculateHappinessScore(lastResult)
  
  const changeFromLast = currentScore - lastScore
  
  const allScores = [...historicalScores, currentScore]
  const avgPreviousScore = historicalScores.reduce((sum, score) => sum + score, 0) / historicalScores.length
  
  if (currentScore === lastScore) {
    return { 
      direction: 'flat', 
      percentageChange: 0,
      changeFromLast: 0,
      historicalScores: allScores
    }
  }
  
  const percentageChange = avgPreviousScore > 0 
    ? ((currentScore - avgPreviousScore) / avgPreviousScore) * 100
    : 0
  
  if (currentScore > lastScore) {
    return { 
      direction: 'up', 
      percentageChange: Math.abs(percentageChange),
      changeFromLast,
      historicalScores: allScores
    }
  }
  
  return { 
    direction: 'down', 
    percentageChange: Math.abs(percentageChange),
    changeFromLast,
    historicalScores: allScores
  }
}

export function getResultsWithTrends(
  currentCheck: HealthCheck,
  allPreviousChecks: HealthCheck[]
): QuestionResult[] {
  const currentResults = calculateVoteResults(currentCheck)
  
  return currentResults.map((current) => {
    const previousResultsForQuestion: VoteResult[] = []
    
    for (const prevCheck of allPreviousChecks) {
      const prevResults = calculateVoteResults(prevCheck)
      const matchingResult = prevResults.find(
        (p) => p.questionText === current.questionText
      )
      if (matchingResult) {
        previousResultsForQuestion.push(matchingResult)
      }
    }
    
    const question = currentCheck.questions.find(q => q.id === current.questionId)
    
    return {
      ...current,
      trend: calculateTrend(current, previousResultsForQuestion),
      happyExplanation: question?.happyExplanation,
      unhappyExplanation: question?.unhappyExplanation,
    }
  })
}

export function generateHealthCheckId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

export function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export const DEFAULT_QUESTIONS = [
  {
    title: 'Value',
    question: 'Do we deliver valuable work that we are proud of and that makes our stakeholders happy?',
    happy: 'We feel our work clearly matters, delivers real impact, and is appreciated by users and stakeholders.',
    unhappy: 'We don\'t see the impact of our work, or we feel we are delivering things that don\'t really matter.'
  },
  {
    title: 'Easy to release',
    question: 'Is releasing our software simple, safe, and mostly automated?',
    happy: 'Releases are routine, low-stress, and something the team can do frequently and confidently.',
    unhappy: 'Releases are painful, risky, infrequent, or require lots of manual steps and coordination.'
  },
  {
    title: 'Suitable process',
    question: 'Does our way of working fit us well and help us do our job effectively?',
    happy: 'Our processes feel helpful rather than restrictive and support how we actually work.',
    unhappy: 'Processes feel heavy, unclear, or imposed, and often get in the way of getting work done.'
  },
  {
    title: 'Tech quality',
    question: 'Is our codebase clean, easy to work with, well tested, and under control?',
    happy: 'The code is understandable, maintainable, and enables us to move forward confidently.',
    unhappy: 'Technical debt, poor tests, or fragile code slow us down and create stress.'
  },
  {
    title: 'Speed',
    question: 'Are we able to get things done quickly without unnecessary delays or blockers?',
    happy: 'We move from idea to production at a good pace and can respond quickly when needed.',
    unhappy: 'Work gets stuck, decisions take too long, or external dependencies constantly block progress.'
  },
  {
    title: 'Mission',
    question: 'Do we clearly understand why we are here and feel motivated by our mission?',
    happy: 'The team has a shared sense of purpose and understands how our work fits into the bigger picture.',
    unhappy: 'Our mission feels unclear, uninspiring, or disconnected from what we do day to day.'
  },
  {
    title: 'Fun',
    question: 'Do we enjoy going to work and have fun working together as a team?',
    happy: 'The team environment is positive, collaborative, and enjoyable.',
    unhappy: 'Work feels draining, tense, or joyless, even when things are going well technically.'
  },
  {
    title: 'Learning',
    question: 'Do we have enough time and opportunity to learn and improve continuously?',
    happy: 'We regularly grow our skills and improve how we work.',
    unhappy: 'There is no time to learn, reflect, or improve, and we are stuck in delivery mode.'
  },
  {
    title: 'Support',
    question: 'Do we get the support and help we need when we ask for it?',
    happy: 'We feel supported by leadership, stakeholders, and other teams.',
    unhappy: 'We feel left alone, unheard, or unable to get help when it matters.'
  },
  {
    title: 'Pawns or players',
    question: 'Do we feel in control of what we build and how we build it?',
    happy: 'We have autonomy and influence over decisions that affect our work.',
    unhappy: 'We feel like order-takers with little say in priorities, solutions, or direction.'
  }
]

export function hasVoted(healthCheckId: string): boolean {
  return localStorage.getItem(`voted_${healthCheckId}`) === 'true'
}

export function markAsVoted(healthCheckId: string): void {
  localStorage.setItem(`voted_${healthCheckId}`, 'true')
}

export function saveUserVotes(healthCheckId: string, votes: Record<string, VoteType>): void {
  localStorage.setItem(`votes_${healthCheckId}`, JSON.stringify(votes))
}

export function getUserVotes(healthCheckId: string): Record<string, VoteType> | null {
  const votesJson = localStorage.getItem(`votes_${healthCheckId}`)
  return votesJson ? JSON.parse(votesJson) : null
}

export function getVoteColor(voteType: VoteType): string {
  switch (voteType) {
    case 'happy':
      return 'bg-happy text-happy-foreground'
    case 'ok':
      return 'bg-ok text-ok-foreground'
    case 'unhappy':
      return 'bg-unhappy text-unhappy-foreground'
  }
}

export function getVoteEmoji(voteType: VoteType): string {
  switch (voteType) {
    case 'happy':
      return '😊'
    case 'ok':
      return '😐'
    case 'unhappy':
      return '😞'
  }
}
