import type { Vote, VoteType } from './_store.js'

const VALID_VOTE_TYPES: VoteType[] = ['happy', 'ok', 'unhappy']

export function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

export function getStringField(body: Record<string, unknown> | null, key: string): string | undefined {
  const value = body?.[key]
  return typeof value === 'string' ? value : undefined
}

export function getUnionField<T extends string>(
  body: Record<string, unknown> | null,
  key: string,
  allowedValues: readonly T[]
): T | undefined {
  const value = body?.[key]
  return typeof value === 'string' && allowedValues.includes(value as T) ? (value as T) : undefined
}

export function isVoteType(value: unknown): value is VoteType {
  return typeof value === 'string' && VALID_VOTE_TYPES.includes(value as VoteType)
}

export function isVote(value: unknown): value is Vote {
  if (!value || typeof value !== 'object') {
    return false
  }

  const vote = value as Vote
  return (
    typeof vote.questionId === 'string' &&
    isVoteType(vote.vote) &&
    typeof vote.timestamp === 'number'
  )
}

