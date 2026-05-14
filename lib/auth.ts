// [安全修復 2026-05-14] PIN-based auth utilities — HMAC token (replacing insecure Base64)
import crypto from 'crypto'

export const AUTH_COOKIE = 'finance_token'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

export function verifyPin(input: string): boolean {
  const pin = process.env.ACCESS_PIN
  if (!pin || !input) return false
  // Constant-time comparison to prevent timing attacks
  const inputBuf = Buffer.from(input.trim())
  const pinBuf = Buffer.from(pin.trim())
  if (inputBuf.length !== pinBuf.length) return false
  return crypto.timingSafeEqual(inputBuf, pinBuf)
}

export function generateToken(): string {
  // HMAC-signed token with timestamp for expiry verification
  const timestamp = Date.now().toString()
  const hmac = crypto
    .createHmac('sha256', process.env.ACCESS_PIN || '')
    .update(`tzlth-finance-${timestamp}`)
    .digest('hex')
  // Format: timestamp.hmac (neither component reveals the PIN)
  return `${timestamp}.${hmac}`
}

export function verifyToken(token: string): boolean {
  if (!token || !process.env.ACCESS_PIN) return false
  try {
    const [timestampStr, providedHmac] = token.split('.')
    if (!timestampStr || !providedHmac) return false

    // Check expiry
    const timestamp = parseInt(timestampStr, 10)
    if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_MAX_AGE_MS) return false

    // Recompute HMAC and compare (constant-time)
    const expectedHmac = crypto
      .createHmac('sha256', process.env.ACCESS_PIN)
      .update(`tzlth-finance-${timestampStr}`)
      .digest('hex')

    const expectedBuf = Buffer.from(expectedHmac)
    const providedBuf = Buffer.from(providedHmac)
    if (expectedBuf.length !== providedBuf.length) return false
    return crypto.timingSafeEqual(expectedBuf, providedBuf)
  } catch {
    return false
  }
}
