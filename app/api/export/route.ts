import { NextRequest, NextResponse } from 'next/server'
import { getIncomeLedger, getExpenseLedger } from '@/lib/github'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

function checkAuth(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  return verifyToken(token ?? '')
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString())
  const type = searchParams.get('type') ?? 'income'

  const BOM = '\uFEFF' // UTF-8 BOM for Excel Chinese compatibility

  if (type === 'income') {
    const ledger = await getIncomeLedger(year)
    const header = 'ID,日期,金額,客戶代號,服務類型,付款方式,狀態,備註'
    const rows = ledger.transactions.map(t =>
      `${t.id},${t.date},${t.amount},${t.client_code},${t.service_type},${t.payment_method},${t.status},"${t.note.replace(/"/g, '""')}"`)
    const csv = BOM + [header, ...rows].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="income-${year}.csv"`,
      },
    })
  }

  if (type === 'expense') {
    const ledger = await getExpenseLedger(year)
    const header = 'ID,日期,金額,類別,說明,固定支出,頻率,備註'
    const rows = ledger.transactions.map(t =>
      `${t.id},${t.date},${t.amount},${t.category},"${t.description.replace(/"/g, '""')}",${t.recurring},${t.recurring_frequency ?? ''},"${t.note.replace(/"/g, '""')}"`)
    const csv = BOM + [header, ...rows].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="expense-${year}.csv"`,
      },
    })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
