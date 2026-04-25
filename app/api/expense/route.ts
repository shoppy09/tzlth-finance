import { NextRequest, NextResponse } from 'next/server'
import { getExpenseLedger, saveExpenseLedger, ExpenseTransaction } from '@/lib/github'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

function checkAuth(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  return verifyToken(token ?? '')
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ledger = await getExpenseLedger()
  return NextResponse.json(ledger)
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const ledger = await getExpenseLedger()
  const txn: ExpenseTransaction = {
    id: `EXP-${body.date.replace(/-/g, '')}-${String(ledger.transactions.length + 1).padStart(3, '0')}`,
    date: body.date,
    amount: Number(body.amount),
    category: body.category ?? 'other',
    description: body.description ?? '',
    recurring: body.recurring ?? false,
    recurring_frequency: body.recurring_frequency,
    note: body.note ?? '',
    created_at: new Date().toISOString(),
  }
  ledger.transactions.push(txn)
  ledger.transactions.sort((a, b) => b.date.localeCompare(a.date))
  const ok = await saveExpenseLedger(ledger)
  return NextResponse.json({ ok, id: txn.id }, { status: ok ? 201 : 500 })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const ledger = await getExpenseLedger()
  ledger.transactions = ledger.transactions.filter(t => t.id !== id)
  const ok = await saveExpenseLedger(ledger)
  return NextResponse.json({ ok })
}
