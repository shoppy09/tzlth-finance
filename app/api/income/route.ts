import { NextRequest, NextResponse } from 'next/server'
import { getIncomeLedgerStrict, updateIncomeLedger, ledgerErrorInfo, IncomeTransaction, listLedgerYears, yearOfDate, yearOfId, nextId, recordDeletedId } from '@/lib/github'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

function checkAuth(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  return verifyToken(token ?? '')
}

// 讀寫失敗一律回錯誤碼（2026-10-10 HQ「寫入失敗審查結果（10-08）」⑥），不再把失敗當成空帳本
function fail(e: unknown) {
  const { status, error } = ledgerErrorInfo(e)
  return NextResponse.json({ ok: false, error }, { status })
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    // 今年＋去年（2026-10-27）：1 月還要看得到、改得到去年 12 月的待收款
    const ledgers = await Promise.all(listLedgerYears().map(y => getIncomeLedgerStrict(y)))
    const transactions = ledgers.flatMap(l => l.transactions).sort((a, b) => b.date.localeCompare(a.date))
    return NextResponse.json({ transactions })
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  // 依交易日期選年度檔（2026-10-27）；日期格式不對直接 400（原本 undefined.replace 會變 500）
  const year = yearOfDate(body.date)
  if (year === null) return NextResponse.json({ ok: false, error: '日期格式需為 YYYY-MM-DD' }, { status: 400 })
  try {
    // 衝突重試時 mutate 會用最新帳本重跑 ⇒ 編號每次重算；刪過的編號不重用（_seq_floor）
    const id = await updateIncomeLedger(ledger => {
      const txn: IncomeTransaction = {
        id: nextId(`INC-${body.date.replace(/-/g, '')}`, ledger.transactions.map(t => t.id), ledger._seq_floor),
        date: body.date,
        amount: Number(body.amount),
        client_code: body.client_code ?? '',
        service_type: body.service_type ?? '',
        payment_method: body.payment_method ?? 'transfer',
        platform: body.platform ?? 'direct',
        status: body.status ?? 'received',
        note: body.note ?? '',
        created_at: new Date().toISOString(),
      }
      ledger.transactions.push(txn)
      // Sort by date desc
      ledger.transactions.sort((a, b) => b.date.localeCompare(a.date))
      return txn.id
    }, year)
    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch (e) {
    return fail(e)
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, status } = await req.json()
  const year = yearOfId(id)
  if (year === null) return NextResponse.json({ ok: false, error: '編號格式不對' }, { status: 400 })
  try {
    const done = await updateIncomeLedger(ledger => {
      const txn = ledger.transactions.find(t => t.id === id)
      if (!txn) return null
      txn.status = status
      return true
    }, year)
    if (done === null) return NextResponse.json({ ok: false, error: '找不到這筆收入' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const year = yearOfId(id)
  if (year === null) return NextResponse.json({ ok: false, error: '編號格式不對' }, { status: 400 })
  try {
    const done = await updateIncomeLedger(ledger => {
      const before = ledger.transactions.length
      ledger.transactions = ledger.transactions.filter(t => t.id !== id)
      if (ledger.transactions.length === before) return null
      recordDeletedId(ledger, id)
      return true
    }, year)
    if (done === null) return NextResponse.json({ ok: false, error: '找不到這筆收入（可能已刪除）' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}
