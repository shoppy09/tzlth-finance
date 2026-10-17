import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE, verifyToken } from './lib/auth'

// [安全修復 2026-10-17] middleware.ts → proxy.ts（Next 16 更名）。
// 原 middleware 跑在 Edge，只能驗 token「格式」；偽造 cookie 即可讀首頁與月報（資安稽核 C-1）。
// proxy 預設跑 Node.js，可直接用 lib/auth.ts 的 verifyToken（node:crypto）做完整驗簽。
// 頁面層另有 lib/require-auth.ts 第二道檢查，proxy 出錯時漏洞也不會重開。

// 放行路徑一律「完全相符」，不用 startsWith（避免日後新增 /login-xxx、/api/summary/xxx 被連帶放行）
const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout', // 只做刪 cookie；cookie 過期的人按登出才回得到登入頁
  '/api/version', // 公開部署自報（commit 7 碼／node 大版本／region），見該 route 檔頭（2026-09-28）
  '/api/summary', // 自帶 API key（Bearer）認證，見該 route（2026-05-14）
])

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value
  if (!token || !verifyToken(token)) {
    // API routes return 401; pages redirect to login
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    if (token) response.cookies.delete(AUTH_COOKIE)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
