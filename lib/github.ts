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

async function getFileSha(path: string): Promise<string | null> {
  const res = await fetch(`${BASE}/repos/${REPO}/contents/${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.sha ?? null
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  const res = await fetch(`${BASE}/repos/${REPO}/contents/${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  })
  if (!res.ok) return fallback
  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return JSON.parse(content)
}

async function writeJsonFile(path: string, content: unknown, message: string): Promise<boolean> {
  const sha = await getFileSha(path)
  const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString('base64')
  const body: Record<string, unknown> = { message, content: encoded }
  if (sha) body.sha = sha
  const res = await fetch(`${BASE}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return res.ok
}

function getIncomePath(year: number) { return `finance/ledger/income-${year}.json` }
function getExpensePath(year: number) { return `finance/ledger/expense-${year}.json` }

export async function getIncomeLedger(year?: number): Promise<IncomeLedger> {
  return readJsonFile<IncomeLedger>(getIncomePath(year ?? new Date().getFullYear()), { transactions: [] })
}

export async function getExpenseLedger(year?: number): Promise<ExpenseLedger> {
  return readJsonFile<ExpenseLedger>(getExpensePath(year ?? new Date().getFullYear()), { transactions: [] })
}

export async function saveIncomeLedger(ledger: IncomeLedger, year?: number): Promise<boolean> {
  const path = getIncomePath(year ?? new Date().getFullYear())
  return writeJsonFile(path, ledger, `finance: update income ledger ${new Date().toISOString().slice(0, 10)}`)
}

export async function saveExpenseLedger(ledger: ExpenseLedger, year?: number): Promise<boolean> {
  const path = getExpensePath(year ?? new Date().getFullYear())
  return writeJsonFile(path, ledger, `finance: update expense ledger ${new Date().toISOString().slice(0, 10)}`)
}

const SUBSCRIPTIONS_PATH = 'finance/ledger/subscriptions.json'

export async function getSubscriptions(): Promise<SubscriptionList> {
  return readJsonFile<SubscriptionList>(SUBSCRIPTIONS_PATH, { subscriptions: [] })
}

export async function saveSubscriptions(data: SubscriptionList): Promise<boolean> {
  return writeJsonFile(SUBSCRIPTIONS_PATH, data, `finance: update subscriptions ${new Date().toISOString().slice(0, 10)}`)
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
