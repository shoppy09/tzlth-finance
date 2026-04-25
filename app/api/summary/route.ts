import { NextRequest, NextResponse } from 'next/server'
import { computeMonthlySummary } from '@/lib/github'

// Public endpoint — called by HQ dashboard FinancePanel
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const summary = await computeMonthlySummary(month)
  return NextResponse.json(summary, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}
