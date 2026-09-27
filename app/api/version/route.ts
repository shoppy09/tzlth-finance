import { NextResponse } from 'next/server'

// 公開端點：回報「目前服務的是哪一次部署」（2026-09-28 HQ tasks L586）
// WHY：Vercel build 失敗會靜默保留舊版；本站全站在 PIN 閘後，無登入者無法機器驗證 push 是否上線。
// 揭露邊界比照 tzlth-line-bot api/health.js：commit 只回 7 碼（本 repo 為 public，commit 本就可查）、node 只回大版本（不送 CVE 指紋）、
//   region 由 X-Vercel-Id 本就可推。⛔ 不得在此加入 env、依賴狀態或任何財務數字。
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || null,
    node: process.version.split('.')[0],
    region: process.env.VERCEL_REGION ?? null,
  })
}
