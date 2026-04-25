import { computeMonthlySummary } from '@/lib/github'

function fmt(n: number) {
  return `NT$${n.toLocaleString('zh-TW')}`
}

export default async function HomePage() {
  const month = new Date().toISOString().slice(0, 7)
  const summary = await computeMonthlySummary(month)

  const netColor = summary.net >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{month.replace('-', ' 年 ')} 月財務總覽</h1>
        <p className="text-gray-400 text-sm mt-1">資料來源：tzlth-hq / finance / ledger</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="本月收入" value={fmt(summary.income_total)} sub={`已收 ${fmt(summary.income_received)}`} color="text-green-400" />
        <KpiCard label="待收款" value={fmt(summary.income_pending)} sub="未確認收款" color="text-yellow-400" />
        <KpiCard label="本月支出" value={fmt(summary.expense_total)} sub={`${summary.transactions.expense_count} 筆`} color="text-orange-400" />
        <KpiCard label="本月淨利" value={fmt(summary.net)} sub={summary.net >= 0 ? '盈餘' : '虧損（建置期正常）'} color={netColor} />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <a href="/income" className="bg-gray-900 border border-gray-800 hover:border-green-600 rounded-xl p-5 transition-colors group">
          <div className="text-2xl mb-2">💵</div>
          <div className="font-semibold text-white group-hover:text-green-400 transition-colors">新增收入</div>
          <div className="text-sm text-gray-500 mt-1">記錄諮詢收款、課程收入</div>
        </a>
        <a href="/expense" className="bg-gray-900 border border-gray-800 hover:border-orange-600 rounded-xl p-5 transition-colors group">
          <div className="text-2xl mb-2">📤</div>
          <div className="font-semibold text-white group-hover:text-orange-400 transition-colors">新增支出</div>
          <div className="text-sm text-gray-500 mt-1">記錄平台費、工具費</div>
        </a>
      </div>

      <p className="text-xs text-gray-600">最後更新：{new Date(summary.last_updated).toLocaleString('zh-TW')}</p>
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-600 mt-1">{sub}</div>
    </div>
  )
}
