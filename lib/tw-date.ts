// 台北日期（2026-10-27 HQ 資安稽核 10-17 第三節「帳本年份取伺服器 UTC 年」）
// WHY：Vercel 伺服器是 UTC，瀏覽器的 toISOString() 也是 UTC ⇒ 台北 00:00～08:00 之間
//   「今天」會是昨天、1/1 清晨會是去年。財務的日期一律以台北為準。
// 伺服器端與 'use client' 頁面共用：只用 Intl，不 import 任何伺服器模組。

const FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' })

/** 台北今天 YYYY-MM-DD */
export function taipeiToday(now: Date = new Date()): string {
  return FMT.format(now) // en-CA 格式即 YYYY-MM-DD
}

/** 台北本月 YYYY-MM */
export function taipeiMonth(now: Date = new Date()): string {
  return taipeiToday(now).slice(0, 7)
}

/** 台北今年 */
export function taipeiYear(now: Date = new Date()): number {
  return Number(taipeiToday(now).slice(0, 4))
}

/** 台北本月幾號 */
export function taipeiDayOfMonth(now: Date = new Date()): number {
  return Number(taipeiToday(now).slice(8, 10))
}

/** 從台北本月往前推 n 個月（含本月），舊到新 */
export function taipeiMonthsBack(n: number, now: Date = new Date()): string[] {
  const [y, m] = taipeiMonth(now).split('-').map(Number)
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const idx = y * 12 + (m - 1) - i
    out.push(`${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`)
  }
  return out
}

/** 兩個 YYYY-MM-DD 相差幾天（to − from），純日曆計算、不受時區影響 */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
}
