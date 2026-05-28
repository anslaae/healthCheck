import test from 'node:test'
import assert from 'node:assert/strict'
import { asObject, getStringField, getUnionField, isVote, isVoteType } from '../api/_validation.js'

test('asObject returns null for non-object values', () => {
  assert.equal(asObject(null), null)
  assert.equal(asObject('text'), null)
  assert.equal(asObject(42), null)
  assert.equal(asObject([]), null)
})

test('asObject returns record for plain object values', () => {
  const value = asObject({ teamId: 'abc' })
  assert.ok(value)
  assert.equal(value?.teamId, 'abc')
})

test('getStringField extracts string values safely', () => {
  const body = { teamId: 'team-1', bad: 123 }
  assert.equal(getStringField(body, 'teamId'), 'team-1')
  assert.equal(getStringField(body, 'bad'), undefined)
  assert.equal(getStringField(null, 'teamId'), undefined)
})

test('getUnionField validates allowed literals', () => {
  const body = { visibility: 'private', wrong: 'hidden' }
  assert.equal(getUnionField(body, 'visibility', ['public', 'private'] as const), 'private')
  assert.equal(getUnionField(body, 'wrong', ['public', 'private'] as const), undefined)
})

test('isVoteType validates supported vote types', () => {
  assert.equal(isVoteType('happy'), true)
  assert.equal(isVoteType('ok'), true)
  assert.equal(isVoteType('unhappy'), true)
  assert.equal(isVoteType('invalid'), false)
})

test('isVote validates vote payload shape', () => {
  assert.equal(
    isVote({ questionId: 'q1', vote: 'happy', timestamp: Date.now() }),
    true
  )

  assert.equal(
    isVote({ questionId: 'q1', vote: 'great', timestamp: Date.now() }),
    false
  )

  assert.equal(
    isVote({ questionId: 'q1', vote: 'ok', timestamp: 'now' }),
    false
  )
})

