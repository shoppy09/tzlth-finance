import { NextRequest, NextResponse } from 'next/server'
import { verifyPin, generateToken, AUTH_COOKIE, COOKIE_MAX_AGE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { pin } = await req.json()
  if (!verifyPin(pin)) {
    // [2026-10-17] 錯誤時固定延遲 1 秒：只拖慢逐次嘗試，擋不住平行請求（serverless 無共享狀態），
    // 不是暴力破解防護；治本＝簽章金鑰與 PIN 分開＋加長 PIN（tzlth-hq tasks 批次:B64）
    await new Promise(resolve => setTimeout(resolve, 1000))
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
