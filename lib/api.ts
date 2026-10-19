// 瀏覽器端呼叫自家 API 的共用入口（2026-10-19 HQ 批次:B63）
// WHY：登入過期（token 7 天）或被登出後，API 回 401，原本頁面只顯示「儲存失敗（GitHub API 異常）」或
//      「資料載入失敗」，會被誤以為是 GitHub 故障。收到 401 一律導回登入頁。
// ⚠️ 只給 'use client' 頁面用（用到 window）；伺服器端頁面由 proxy.ts／requireAuth 擋。
export async function api(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status === 401 && typeof window !== 'undefined') {
    // 刻意整頁重新載入（清掉頁面狀態，交給 proxy.ts 接手），不用 router.push
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/login'
  }
  return res
}
