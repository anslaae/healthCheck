import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

// ─── Public types ────────────────────────────────────────────────────────────

export type AuthProvider = 'github'

export interface AuthUser {
  id: string
  login: string
  name: string
  avatarUrl?: string
  email?: string
}

export interface AuthSessionPayload {
  provider: AuthProvider
  user: AuthUser
  issuedAt: number
  expiresAt: number
}

export interface OAuthFlowPayload {
  state: string
  codeVerifier: string
  returnTo: string
  expiresAt: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_COOKIE_NAME = 'hc_session'
const OAUTH_COOKIE_NAME = 'hc_oauth'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days
const OAUTH_TTL_SECONDS = 60 * 10 // 10 minutes
const SESSION_KEY_PREFIX = 'hc:session:'

// ─── Secret / signing helpers ────────────────────────────────────────────────

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET
  if (!secret) {
    throw new Error('AUTH_SESSION_SECRET is not set')
  }
  return secret
}

function base64UrlEncode(input: Buffer | string): string {
  const source = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return source.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const paddingLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(paddingLength)
  return Buffer.from(padded, 'base64').toString('utf8')
}

function sign(value: string): string {
  return base64UrlEncode(createHmac('sha256', getSessionSecret()).update(value).digest())
}

// Used only for the OAuth PKCE cookie (short-lived, still payload-in-cookie).
function serializeSignedPayload(payload: object): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

function parseSignedPayload<T>(signedValue: string | undefined): T | null {
  if (!signedValue) {
    return null
  }

  const [payloadPart, signaturePart] = signedValue.split('.')
  if (!payloadPart || !signaturePart) {
    return null
  }

  const expected = sign(payloadPart)
  const signatureBuf = Buffer.from(signaturePart)
  const expectedBuf = Buffer.from(expected)

  if (signatureBuf.length !== expectedBuf.length) {
    return null
  }

  if (!timingSafeEqual(signatureBuf, expectedBuf)) {
    return null
  }

  try {
    return JSON.parse(base64UrlDecode(payloadPart)) as T
  } catch {
    return null
  }
}

// ─── Cookie serialization helpers ────────────────────────────────────────────

function appendSetCookie(res: VercelResponse, cookie: string): void {
  const current = res.getHeader('Set-Cookie')

  if (!current) {
    res.setHeader('Set-Cookie', cookie)
    return
  }

  if (Array.isArray(current)) {
    res.setHeader('Set-Cookie', [...current, cookie])
    return
  }

  res.setHeader('Set-Cookie', [String(current), cookie])
}

function serializeCookie(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAgeSeconds}`
}

function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`
}

// ─── Request helpers ─────────────────────────────────────────────────────────

export function parseCookies(req: VercelRequest): Record<string, string> {
  const header = req.headers.cookie
  if (!header) {
    return {}
  }

  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, cookiePart) => {
      const index = cookiePart.indexOf('=')
      if (index <= 0) {
        return acc
      }
      const name = cookiePart.slice(0, index)
      const value = cookiePart.slice(index + 1)
      acc[name] = value
      return acc
    }, {})
}

export function safeReturnTo(input: unknown): string {
  if (typeof input !== 'string' || !input.startsWith('/')) {
    return '/'
  }

  if (input.startsWith('//')) {
    return '/'
  }

  return input
}

export function resolveAppOrigin(req: VercelRequest): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, '')
  }

  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const protoHeader = req.headers['x-forwarded-proto']
  const proto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : protoHeader?.split(',')[0] ?? 'https'

  return `${proto}://${host}`
}

// ─── CSRF origin check ───────────────────────────────────────────────────────

/**
 * Validates that a mutating request (POST/DELETE) originates from this app.
 *
 * Rules:
 *   1. If `Origin` is present, it must exactly match app origin.
 *   2. Otherwise, if `Referer` is present, its origin must match app origin.
 *   3. If neither header is present, reject.
 */
export function isCsrfSafe(req: VercelRequest): boolean {
  const expectedOrigin = resolveAppOrigin(req)

  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  if (origin) {
    return origin === expectedOrigin
  }

  const refererHeader = req.headers.referer
  const referer = Array.isArray(refererHeader) ? refererHeader[0] : refererHeader
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin
    } catch {
      return false
    }
  }

  return false
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

export function randomState(): string {
  return base64UrlEncode(randomBytes(24))
}

export function randomCodeVerifier(): string {
  return base64UrlEncode(randomBytes(48))
}

export function pkceChallengeFromVerifier(verifier: string): string {
  const digest = createHash('sha256').update(verifier).digest()
  return base64UrlEncode(digest)
}

// ─── OAuth PKCE cookie (payload-in-cookie, short-lived) ──────────────────────

type OauthCookieInput = {
  state: string
  codeVerifier: string
  returnTo: string
}

export function setOAuthCookie(res: VercelResponse, payload: OauthCookieInput): void {
  const signed = serializeSignedPayload({
    ...payload,
    expiresAt: Date.now() + OAUTH_TTL_SECONDS * 1000,
  })

  appendSetCookie(res, serializeCookie(OAUTH_COOKIE_NAME, signed, OAUTH_TTL_SECONDS))
}

export function getOAuthCookie(req: VercelRequest): OAuthFlowPayload | null {
  const cookies = parseCookies(req)
  const payload = parseSignedPayload<OAuthFlowPayload>(cookies[OAUTH_COOKIE_NAME])

  if (!payload || payload.expiresAt < Date.now()) {
    return null
  }

  return payload
}

export function clearOAuthCookie(res: VercelResponse): void {
  appendSetCookie(res, clearCookie(OAUTH_COOKIE_NAME))
}

// ─── Redis session store (with in-memory fallback for local dev) ──────────────

/**
 * In-process session store used when Redis env vars are not configured.
 * Sessions are lost on process restart and are not shared across instances.
 * Suitable for local development only.
 */
interface DevStoreEntry {
  payload: AuthSessionPayload
  expiresAt: number
}
const _devStore = new Map<string, DevStoreEntry>()
let _didLogRedisMissingProd = false
let _didLogRedisMissingDev = false

let _redis: Redis | null = null

function getRedisCredentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return null
  }

  return { url, token }
}

function getRedisClient(): Redis | null {
  if (_redis) {
    return _redis
  }

  const credentials = getRedisCredentials()
  if (!credentials) {
    return null
  }

  _redis = new Redis({ url: credentials.url, token: credentials.token })
  return _redis
}

function logRedisMissingOnce(): void {
  if (process.env.NODE_ENV === 'production') {
    if (_didLogRedisMissingProd) {
      return
    }
    _didLogRedisMissingProd = true
    console.error('[auth] Redis not configured in production — sessions will not persist across instances')
    return
  }

  if (_didLogRedisMissingDev) {
    return
  }
  _didLogRedisMissingDev = true
  console.warn('[auth] Redis not configured — using in-process session store (local dev only)')
}

async function storeGet(key: string): Promise<AuthSessionPayload | null> {
  const redis = getRedisClient()
  if (redis) {
    return redis.get<AuthSessionPayload>(key)
  }

  logRedisMissingOnce()

  const entry = _devStore.get(key)
  if (!entry || entry.expiresAt < Date.now()) {
    _devStore.delete(key)
    return null
  }
  return entry.payload
}

async function storeSet(key: string, payload: AuthSessionPayload, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient()
  if (redis) {
    await redis.set(key, payload, { ex: ttlSeconds })
    return
  }

  logRedisMissingOnce()

  _devStore.set(key, { payload, expiresAt: Date.now() + ttlSeconds * 1000 })
}

async function storeDel(key: string): Promise<void> {
  const redis = getRedisClient()
  if (redis) {
    await redis.del(key)
    return
  }
  _devStore.delete(key)
}

// ─── Opaque session ID helpers ────────────────────────────────────────────────
//
// Cookie value format:  <sessionId>.<HMAC-SHA256(sessionId)>
//
// Both parts are base64url-encoded (no '.' characters), so the first '.' is
// always the separator. The HMAC protects against forged session IDs without
// requiring a round-trip to the store for clearly-invalid values.

function randomSessionId(): string {
  return base64UrlEncode(randomBytes(32))
}

function signSessionId(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`
}

/**
 * Verifies the HMAC on a signed session cookie value and returns the raw
 * session ID, or null if the value is missing / tampered.
 */
function verifySignedSessionId(cookieValue: string): string | null {
  const dotIndex = cookieValue.indexOf('.')
  if (dotIndex < 1) {
    return null
  }

  const sessionId = cookieValue.slice(0, dotIndex)
  const sigPart = cookieValue.slice(dotIndex + 1)

  if (!sessionId || !sigPart) {
    return null
  }

  const expected = sign(sessionId)
  const sigBuf = Buffer.from(sigPart)
  const expBuf = Buffer.from(expected)

  if (sigBuf.length !== expBuf.length) {
    return null
  }

  if (!timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  return sessionId
}

// ─── Public session API ───────────────────────────────────────────────────────

/**
 * Creates a new server-side session in Redis and sets an opaque signed session ID
 * cookie on the response.
 */
export async function setSessionCookie(
  res: VercelResponse,
  payload: Omit<AuthSessionPayload, 'issuedAt' | 'expiresAt'>
): Promise<void> {
  const issuedAt = Date.now()
  const expiresAt = issuedAt + SESSION_TTL_SECONDS * 1000
  const sessionId = randomSessionId()

  const fullPayload: AuthSessionPayload = { ...payload, issuedAt, expiresAt }
  await storeSet(`${SESSION_KEY_PREFIX}${sessionId}`, fullPayload, SESSION_TTL_SECONDS)

  appendSetCookie(res, serializeCookie(SESSION_COOKIE_NAME, signSessionId(sessionId), SESSION_TTL_SECONDS))
}

/**
 * Reads the opaque session ID from the cookie, verifies its HMAC, then
 * fetches the session payload from Redis. Returns null if absent, tampered,
 * or expired.
 */
export async function getSessionCookie(req: VercelRequest): Promise<AuthSessionPayload | null> {
  const cookies = parseCookies(req)
  const cookieValue = cookies[SESSION_COOKIE_NAME]
  if (!cookieValue) {
    return null
  }

  const sessionId = verifySignedSessionId(cookieValue)
  if (!sessionId) {
    return null
  }

  const payload = await storeGet(`${SESSION_KEY_PREFIX}${sessionId}`)
  if (!payload || payload.expiresAt < Date.now()) {
    return null
  }

  return payload
}

/**
 * Deletes the session from Redis (revocation) and clears the session cookie.
 * Use this for logout flows where immediate invalidation is required.
 */
export async function revokeSession(req: VercelRequest, res: VercelResponse): Promise<void> {
  const cookies = parseCookies(req)
  const cookieValue = cookies[SESSION_COOKIE_NAME]

  if (cookieValue) {
    const sessionId = verifySignedSessionId(cookieValue)
    if (sessionId) {
      await storeDel(`${SESSION_KEY_PREFIX}${sessionId}`)
    }
  }

  appendSetCookie(res, clearCookie(SESSION_COOKIE_NAME))
}

/**
 * Clears the session cookie without hitting the store.
 * Use on error paths where no session was created (e.g. OAuth callback failure).
 */
export function clearSessionCookie(res: VercelResponse): void {
  appendSetCookie(res, clearCookie(SESSION_COOKIE_NAME))
}
