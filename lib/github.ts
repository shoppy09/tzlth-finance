// GitHub API helper — reads/writes tzlth-hq/finance/ledger/
// Pattern: same as hq-dashboard checklist-state

const REPO = process.env.DATA_REPO ?? 'shoppy09/tzlth-hq'
const TOKEN = process.env.GITHUB_TOKEN ?? ''
const BASE = 'https://api.github.com'

export interface IncomeTransaction {
  id: string
  date: string          // YYYY-MM-DD
  amount: number        // NT$
  client_code: string   // e.g. C-202604-001
  service_type: string  // S0/S4/S6/其他
  payment_method: string // transfer/cash/other
  platform?: string     // 成交平台 direct/vocus/portaly/buymeacoffee/other；舊筆無此欄＝direct（2026-09-28 RCF-206）
  status: string        // received/pending
  note: string
  created_at: string
}

export interface ExpenseTransaction {
  id: string
  date: string          // YYYY-MM-DD
  amount: number        // NT$
  category: string      // platform/domain/certification/tool/other
  description: string
  recurring: boolean
  recurring_frequency?: string // monthly/yearly
  note: string
  created_at: string
}

export interface Subscription {
  id: string              // SUB-YYYYMMDD-001
  name: string            // 工具名稱
  category: 'ai' | 'platform' | 'domain' | 'tool' | 'storage' | 'other'
  type: 'paid' | 'free' | 'trial'
  cost: number            // NT$，免費 = 0
  billing_cycle: 'monthly' | 'yearly' | 'one-time' | 'free'
  renewal_date: string | null   // YYYY-MM-DD，月費自動扣 = null
  status: 'active' | 'cancelled' | 'paused'
  watch_pricing: boolean  // 免費但監控定價異動
  url: string
  note: string
  created_at: string
}

export interface SubscriptionList { subscriptions: Subscription[] }

export interface IncomeLedger { transactions: IncomeTransaction[] }
export interface ExpenseLedger { transactions: ExpenseTransaction[] }

const GH_HEADERS = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' }

// 唯讀顯示用（首頁／報表／匯出／summary）：讀失敗回空值。⛔ 寫入路徑不得使用，改用下方 readStrict／updateJsonFile。
async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  const res = await fetch(`${BASE}/repos/${REPO}/contents/${path}`, { headers: GH_HEADERS, cache: 'no-store' })
  if (!res.ok) return fallback
  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return JSON.parse(content)
}

// ── 寫入路徑（2026-10-10，HQ tasks「寫入失敗審查結果（10-08）」⑥）────────────────
// 舊寫法：讀帳本任何非 2xx 都回空帳本、寫入前另抓一次 sha ⇒ 讀失敗而 sha 成功時，會用「空帳本＋本次變更」
//   覆蓋整份帳本並回成功；兩邊同時寫入時後寫蓋前寫、不會 409。
// 新寫法照 hq-dashboard lib/github.ts setChecklistKey：只有 404 當成「檔案還不存在」；sha 取自同一次讀取；
//   409／422 時整個「讀 → 改 → 寫」重做一次；其餘一律拋錯，由 route 回錯誤碼、前端顯示。
export class LedgerReadError extends Error {}
export class LedgerConflictError extends Error {}
export class LedgerWriteError extends Error {}

async function readStrict<T>(path: string, fallback: () => T): Promise<{ data: T; sha?: string }> {
  const res = await fetch(`${BASE}/repos/${REPO}/contents/${path}`, { headers: GH_HEADERS, cache: 'no-store' })
  if (res.status === 404) return { data: fallback() }
  if (!res.ok) throw new LedgerReadError(`讀取 ${path} 失敗（HTTP ${res.status}）`)
  const meta = await res.json()
  return { data: JSON.parse(Buffer.from(meta.content, 'base64').toString('utf-8')) as T, sha: meta.sha }
}

// mutate 回傳 null ＝放棄寫入（例：要改的那筆不存在），本函式回 null、不送 PUT
async function updateJsonFile<T, R>(path: string, fallback: () => T, message: string, mutate: (data: T) => R | null): Promise<R | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, sha } = await readStrict(path, fallback)
    const result = mutate(data)
    if (result === null) return null
    const res = await fetch(`${BASE}/repos/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: { ...GH_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
        ...(sha ? { sha } : {}),
      }),
    })
    if (res.ok) return result
    if ((res.status === 409 || res.status === 422) && attempt === 0) continue
    if (res.status === 409 || res.status === 422) throw new LedgerConflictError(`寫入 ${path} 衝突（HTTP ${res.status}），重試後仍失敗`)
    throw new LedgerWriteError(`寫入 ${path} 失敗（HTTP ${res.status}）`)
  }
  throw new LedgerConflictError(`寫入 ${path} 衝突，重試後仍失敗`)
}

// route 用：錯誤 → HTTP 狀態碼與訊息（不含任何帳本內容）
export function ledgerErrorInfo(e: unknown): { status: number; error: string } {
  if (e instanceof LedgerReadError) return { status: 503, error: e.message }
  if (e instanceof LedgerConflictError) return { status: 409, error: e.message }
  if (e instanceof LedgerWriteError) return { status: 502, error: e.message }
  console.error('[finance] 未預期錯誤', e)
  return { status: 500, error: '未預期錯誤' }
}

function getIncomePath(year: number) { return `finance/ledger/income-${year}.json` }
function getExpensePath(year: number) { return `finance/ledger/expense-${year}.json` }
const today = () => new Date().toISOString().slice(0, 10)

export async function getIncomeLedger(year?: number): Promise<IncomeLedger> {
  return readJsonFile<IncomeLedger>(getIncomePath(year ?? new Date().getFullYear()), { transactions: [] })
}

export async function getExpenseLedger(year?: number): Promise<ExpenseLedger> {
  return readJsonFile<ExpenseLedger>(getExpensePath(year ?? new Date().getFullYear()), { transactions: [] })
}

// 列表頁 API 用：讀失敗拋錯（前端顯示「資料載入失敗」，不再把失敗顯示成空帳）
export async function getIncomeLedgerStrict(year?: number): Promise<IncomeLedger> {
  return (await readStrict<IncomeLedger>(getIncomePath(year ?? new Date().getFullYear()), () => ({ transactions: [] }))).data
}

export async function getExpenseLedgerStrict(year?: number): Promise<ExpenseLedger> {
  return (await readStrict<ExpenseLedger>(getExpensePath(year ?? new Date().getFullYear()), () => ({ transactions: [] }))).data
}

export async function updateIncomeLedger<R>(mutate: (ledger: IncomeLedger) => R | null, year?: number): Promise<R | null> {
  return updateJsonFile(getIncomePath(year ?? new Date().getFullYear()), () => ({ transactions: [] as IncomeTransaction[] }),
    `finance: update income ledger ${today()}`, mutate)
}

export async function updateExpenseLedger<R>(mutate: (ledger: ExpenseLedger) => R | null, year?: number): Promise<R | null> {
  return updateJsonFile(getExpensePath(year ?? new Date().getFullYear()), () => ({ transactions: [] as ExpenseTransaction[] }),
    `finance: update expense ledger ${today()}`, mutate)
}

const SUBSCRIPTIONS_PATH = 'finance/ledger/subscriptions.json'

export async function getSubscriptions(): Promise<SubscriptionList> {
  return readJsonFile<SubscriptionList>(SUBSCRIPTIONS_PATH, { subscriptions: [] })
}

export async function getSubscriptionsStrict(): Promise<SubscriptionList> {
  return (await readStrict<SubscriptionList>(SUBSCRIPTIONS_PATH, () => ({ subscriptions: [] }))).data
}

export async function updateSubscriptions<R>(mutate: (data: SubscriptionList) => R | null): Promise<R | null> {
  return updateJsonFile(SUBSCRIPTIONS_PATH, () => ({ subscriptions: [] as Subscription[] }),
    `finance: update subscriptions ${today()}`, mutate)
}

// RCF-009 整合：預約系統每日收入 JSON（由 GitHub Actions 每日 UTC 17:00 同步）
export interface DailyBookingRecord {
  date: string
  booking_by_date:  { count: number; revenue: number; order_ids: string[] }
  payment_by_date:  { count: number; revenue: number; order_ids: string[] }
  created_by_date:  { count_total: number; count_confirmed: number; count_cancelled: number }
  tenant: string
  synced_at: string
}

export interface DailyRevenueData {
  records: DailyBookingRecord[]
}

export async function getDailyRevenue(month: string): Promise<DailyRevenueData> {
  return readJsonFile<DailyRevenueData>(`finance/${month}-daily.json`, { records: [] })
}

// Summary for /api/summary (used by HQ dashboard)
export async function computeMonthlySummary(month: string) {
  // month format: YYYY-MM (or YYYY for full-year view)
  const year = parseInt(month.slice(0, 4))
  const income = await getIncomeLedger(year)
  const expense = await getExpenseLedger(year)

  const incTxns = income.transactions.filter(t => t.date.startsWith(month))
  const expTxns = expense.transactions.filter(t => t.date.startsWith(month))

  const income_received = incTxns.filter(t => t.status === 'received').reduce((s, t) => s + t.amount, 0)
  const income_pending = incTxns.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0)
  const expense_total = expTxns.reduce((s, t) => s + t.amount, 0)

  return {
    month,
    income_total: income_received + income_pending,
    income_received,
    income_pending,
    expense_total,
    net: income_received - expense_total,
    transactions: {
      income_count: incTxns.length,
      expense_count: expTxns.length,
    },
    last_updated: new Date().toISOString(),
  }
}
