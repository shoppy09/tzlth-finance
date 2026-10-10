import { NextRequest, NextResponse } from 'next/server'
import { getIncomeLedgerStrict, updateIncomeLedger, ledgerErrorInfo, IncomeTransaction } from '@/lib/github'
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
    return NextResponse.json(await getIncomeLedgerStrict())
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  try {
    // 衝突重試時 mutate 會用最新帳本重跑 ⇒ 編號每次重算
    const id = await updateIncomeLedger(ledger => {
      const dateStr = body.date.replace(/-/g, '')
      const prefix = `INC-${dateStr}-`
      const existing = ledger.transactions
        .filter(t => t.id.startsWith(prefix))
        .map(t => parseInt(t.id.replace(prefix, ''), 10))
      const maxSeq = existing.length > 0 ? Math.max(...existing) : 0
      const txn: IncomeTransaction = {
        id: `INC-${dateStr}-${String(maxSeq + 1).padStart(3, '0')}`,
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
    })
    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch (e) {
    return fail(e)
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, status } = await req.json()
  try {
    const done = await updateIncomeLedger(ledger => {
      const txn = ledger.transactions.find(t => t.id === id)
      if (!txn) return null
      txn.status = status
      return true
    })
    if (done === null) return NextResponse.json({ ok: false, error: '找不到這筆收入' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  try {
    const done = await updateIncomeLedger(ledger => {
      const before = ledger.transactions.length
      ledger.transactions = ledger.transactions.filter(t => t.id !== id)
      return ledger.transactions.length < before ? true : null
    })
    if (done === null) return NextResponse.json({ ok: false, error: '找不到這筆收入（可能已刪除）' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}
