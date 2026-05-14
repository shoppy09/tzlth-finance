import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE } from './lib/auth'

const PUBLIC_PATHS = ['/login', '/api/auth/login']
// [安全修復 2026-05-14] /api/summary 移出公開路徑，改為 API key 認證

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // /api/summary has its own auth (API key) — let it through to the route handler
  if (pathname.startsWith('/api/summary')) {
    return NextResponse.next()
  }

  // Check auth cookie
  const token = request.cookies.get(AUTH_COOKIE)?.value
  if (!token) {
    // API routes return 401; pages redirect to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // [安全修復 2026-05-14] Token 格式基本驗證（完整驗證在各 API route）
  // 新格式：timestamp.hmac（舊 Base64 token 會在此被拒絕，需重新登入）
  if (!token.includes('.') || token.split('.').length !== 2) {
    // Invalid token format — clear and redirect to login
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(AUTH_COOKIE)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
