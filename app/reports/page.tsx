import { getIncomeLedger, getExpenseLedger } from '@/lib/github'

function fmt(n: number) {
  return `NT$${n.toLocaleString('zh-TW')}`
}

function monthsBack(n: number): string[] {
  const months: string[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

export default async function ReportsPage() {
  const months = monthsBack(6)

  // Fetch unique years needed
  const years = [...new Set(months.map(m => parseInt(m.slice(0, 4))))]
  const [incomeData, expenseData] = await Promise.all([
    Promise.all(years.map(y => getIncomeLedger(y))),
    Promise.all(years.map(y => getExpenseLedger(y))),
  ])

  const incomeByYear: Record<number, typeof incomeData[0]> = {}
  const expenseByYear: Record<number, typeof expenseData[0]> = {}
  years.forEach((y, i) => {
    incomeByYear[y] = incomeData[i]
    expenseByYear[y] = expenseData[i]
  })

  const rows = months.map(month => {
    const year = parseInt(month.slice(0, 4))
    const inc = incomeByYear[year]?.transactions.filter(t => t.date.startsWith(month)) ?? []
    const exp = expenseByYear[year]?.transactions.filter(t => t.date.startsWith(month)) ?? []
    const income_received = inc.filter(t => t.status === 'received').reduce((s, t) => s + t.amount, 0)
    const income_pending = inc.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0)
    const expense_total = exp.reduce((s, t) => s + t.amount, 0)
    const net = income_received - expense_total
    return { month, income_received, income_pending, expense_total, net }
  })

  const maxIncome = Math.max(...rows.map(r => r.income_received + r.income_pending), 1)
  const maxExpense = Math.max(...rows.map(r => r.expense_total), 1)
  const maxBar = Math.max(maxIncome, maxExpense)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">月報總覽</h1>
        <p className="text-gray-400 text-sm mt-1">近 6 個月收支趨勢</p>
      </div>

      {/* Bar chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-medium text-gray-400 mb-6">收支長條圖</h2>
        <div className="space-y-5">
          {rows.map(row => (
            <div key={row.month}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500 w-16">{row.month.slice(5)}月</span>
                <div className="flex-1 space-y-1">
                  {/* Income bar */}
                  <div className="flex items-center gap-2">
                    <div className="w-12 text-right text-xs text-gray-600">收入</div>
                    <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full"
                        style={{ width: `${((row.income_received + row.income_pending) / maxBar) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-green-400 w-24 text-right">{fmt(row.income_received + row.income_pending)}</span>
                  </div>
                  {/* Expense bar */}
                  <div className="flex items-center gap-2">
                    <div className="w-12 text-right text-xs text-gray-600">支出</div>
                    <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-orange-600 rounded-full"
                        style={{ width: `${(row.expense_total / maxBar) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-orange-400 w-24 text-right">{fmt(row.expense_total)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium">月份</th>
              <th className="px-5 py-3 text-right text-xs text-gray-500 font-medium">已收</th>
              <th className="px-5 py-3 text-right text-xs text-gray-500 font-medium">待收</th>
              <th className="px-5 py-3 text-right text-xs text-gray-500 font-medium">支出</th>
              <th className="px-5 py-3 text-right text-xs text-gray-500 font-medium">淨利</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map(row => (
              <tr key={row.month} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-5 py-3 text-gray-300">{row.month}</td>
                <td className="px-5 py-3 text-right text-green-400">{fmt(row.income_received)}</td>
                <td className="px-5 py-3 text-right text-yellow-400">{fmt(row.income_pending)}</td>
                <td className="px-5 py-3 text-right text-orange-400">{fmt(row.expense_total)}</td>
                <td className={`px-5 py-3 text-right font-semibold ${row.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmt(row.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
