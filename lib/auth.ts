// Simple PIN-based auth utilities

export const AUTH_COOKIE = 'finance_token'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

export function verifyPin(input: string): boolean {
  const pin = process.env.ACCESS_PIN
  if (!pin) return false
  return input.trim() === pin.trim()
}

export function generateToken(): string {
  // Simple token: PIN hash embedded so we can verify without DB
  return Buffer.from(`tzlth-finance-${Date.now()}-${process.env.ACCESS_PIN}`).toString('base64')
}

export function verifyToken(token: string): boolean {
  if (!token) return false
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    return decoded.includes('tzlth-finance-') && decoded.endsWith(`-${process.env.ACCESS_PIN}`)
  } catch {
    return false
  }
}
