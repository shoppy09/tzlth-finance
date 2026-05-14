import { NextRequest, NextResponse } from 'next/server'
import { computeMonthlySummary } from '@/lib/github'

// [安全修復 2026-05-14] 需 API key 認證，不再公開存取
// HQ 儀表板透過 server-side proxy 呼叫，API key 存在 Vercel 環境變數
export async function GET(req: NextRequest) {
  // 驗證 API key
  const apiKey = process.env.SUMMARY_API_KEY
  const authHeader = req.headers.get('authorization')
  const providedKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!apiKey || !providedKey || providedKey !== apiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const summary = await computeMonthlySummary(month)

  // CORS 僅允許 HQ 儀表板
  return NextResponse.json(summary, {
    headers: { 'Access-Control-Allow-Origin': 'https://dashboard.careerssl.com' },
  })
}
