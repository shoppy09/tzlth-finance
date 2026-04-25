'use client'

import { useState, useEffect, useCallback } from 'react'
import { IncomeTransaction } from '@/lib/github'

const SERVICE_TYPES = ['S0', 'S4', 'S6', '企業包案', '課程', '電子書', '其他']
const PAYMENT_METHODS = ['transfer', 'cash', 'other']
const PAYMENT_LABELS: Record<string, string> = { transfer: '轉帳', cash: '現金', other: '其他' }

export default function IncomePage() {
  const [transactions, setTransactions] = useState<IncomeTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    client_code: '',
    service_type: 'S4',
    payment_method: 'transfer',
    status: 'received',
    note: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/income')
    if (res.ok) {
      const data = await res.json()
      setTransactions(data.transactions ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ date: new Date().toISOString().slice(0, 10), amount: '', client_code: '', service_type: 'S4', payment_method: 'transfer', status: 'received', note: '' })
      await load()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('確定刪除這筆收入記錄？')) return
    await fetch('/api/income', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await load()
  }

  const totalReceived = transactions.filter(t => t.status === 'received').reduce((s, t) => s + t.amount, 0)
  const totalPending = transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">收入流水帳</h1>
          <p className="text-gray-400 text-sm mt-1">
            已收 <span className="text-green-400 font-semibold">NT${totalReceived.toLocaleString()}</span>
            　待收 <span className="text-yellow-400 font-semibold">NT${totalPending.toLocaleString()}</span>
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + 新增收入
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-white">新增收入記錄</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">日期 *</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" required />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">金額（NT$）*</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="2000" required />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">客戶代號</label>
              <input type="text" value={form.client_code} onChange={e => setForm({...form, client_code: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="C-202604-001" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">服務類型</label>
              <select value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">付款方式</label>
              <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">狀態</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                <option value="received">已收款</option>
                <option value="pending">待收款</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">備註</label>
            <input type="text" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="（選填）" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {saving ? '儲存中...' : '確認新增'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 transition-colors">取消</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm">載入中...</div>
      ) : transactions.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-12">還沒有收入記錄，點「+ 新增收入」開始記帳</div>
      ) : (
        <div className="space-y-2">
          {transactions.map(t => (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="text-sm text-gray-400 w-24">{t.date}</div>
              <div className="flex-1">
                <span className="text-white font-medium">{t.service_type}</span>
                {t.client_code && <span className="text-gray-500 text-xs ml-2">{t.client_code}</span>}
                {t.note && <span className="text-gray-500 text-xs ml-2">· {t.note}</span>}
              </div>
              <div className="text-xs text-gray-500">{PAYMENT_LABELS[t.payment_method] ?? t.payment_method}</div>
              <div className={`text-sm font-semibold w-20 text-right ${t.status === 'received' ? 'text-green-400' : 'text-yellow-400'}`}>
                NT${t.amount.toLocaleString()}
              </div>
              <div className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'received' ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>
                {t.status === 'received' ? '已收' : '待收'}
              </div>
              <button onClick={() => handleDelete(t.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">刪除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
