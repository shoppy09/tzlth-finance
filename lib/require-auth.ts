// [安全修復 2026-10-17] 伺服端頁面的第二道驗簽（資安稽核 C-1）
// 首頁與月報是伺服端元件、直接讀帳本，不經 API 的 verifyToken。
// proxy.ts 已驗簽；這裡再驗一次，proxy 被繞過或設定出錯時仍擋得住。
// ⚠️ redirect() 靠拋例外運作：不要包進 try/catch。
// ⚠️ Server Component 不能刪 cookie（cookies().delete 只能在 Route Handler／Server Function），只導回登入頁。
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AUTH_COOKIE, verifyToken } from './auth'

export async function requireAuth(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  if (!token || !verifyToken(token)) {
    redirect('/login')
  }
}
