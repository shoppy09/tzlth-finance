import { NextRequest, NextResponse } from 'next/server'
import { verifyPin, generateToken, AUTH_COOKIE, COOKIE_MAX_AGE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { pin } = await req.json()
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }
  const token = generateToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return res
}
