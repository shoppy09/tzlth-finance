import { NextRequest, NextResponse } from 'next/server'
import { getIncomeLedger, saveIncomeLedger, IncomeTransaction } from '@/lib/github'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

function checkAuth(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  return verifyToken(token ?? '')
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ledger = await getIncomeLedger()
  return NextResponse.json(ledger)
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const ledger = await getIncomeLedger()
  const txn: IncomeTransaction = {
    id: `INC-${body.date.replace(/-/g, '')}-${String(ledger.transactions.length + 1).padStart(3, '0')}`,
    date: body.date,
    amount: Number(body.amount),
    client_code: body.client_code ?? '',
    service_type: body.service_type ?? '',
    payment_method: body.payment_method ?? 'transfer',
    status: body.status ?? 'received',
    note: body.note ?? '',
    created_at: new Date().toISOString(),
  }
  ledger.transactions.push(txn)
  // Sort by date desc
  ledger.transactions.sort((a, b) => b.date.localeCompare(a.date))
  const ok = await saveIncomeLedger(ledger)
  return NextResponse.json({ ok, id: txn.id }, { status: ok ? 201 : 500 })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const ledger = await getIncomeLedger()
  ledger.transactions = ledger.transactions.filter(t => t.id !== id)
  const ok = await saveIncomeLedger(ledger)
  return NextResponse.json({ ok })
}
