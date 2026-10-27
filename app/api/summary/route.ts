import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { computeMonthlySummary } from '@/lib/github'
import { taipeiMonth } from '@/lib/tw-date'

// [2026-10-17] 常數時間比對（同 lib/auth.ts verifyToken 寫法：先比 Buffer 長度，timingSafeEqual 長度不同會拋例外）
function keyMatches(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(providedBuf, expectedBuf)
}

// [安全修復 2026-05-14] 需 API key 認證，不再公開存取
// HQ 儀表板透過 server-side proxy 呼叫，API key 存在 Vercel 環境變數
export async function GET(req: NextRequest) {
  // 驗證 API key
  const apiKey = process.env.SUMMARY_API_KEY
  const authHeader = req.headers.get('authorization')
  const providedKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!apiKey || !providedKey || !keyMatches(providedKey, apiKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ?? taipeiMonth() // 台北本月（2026-10-27，原 UTC）
  const summary = await computeMonthlySummary(month)

  // CORS 僅允許 HQ 儀表板
  return NextResponse.json(summary, {
    headers: { 'Access-Control-Allow-Origin': 'https://dashboard.careerssl.com' },
  })
}
