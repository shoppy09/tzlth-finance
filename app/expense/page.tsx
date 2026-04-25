'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExpenseTransaction } from '@/lib/github'

const CATEGORIES = [
  { value: 'platform', label: '平台費用' },
  { value: 'domain', label: '網域費用' },
  { value: 'tool', label: '工具訂閱' },
  { value: 'certification', label: '認證/課程' },
  { value: 'equipment', label: '設備' },
  { value: 'other', label: '其他' },
]

export default function ExpensePage() {
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    category: 'platform',
    description: '',
    recurring: false,
    recurring_frequency: 'monthly',
    note: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    const res = await fetch('/api/expense')
    if (res.ok) {
      const data = await res.json()
      setTransactions(data.transactions ?? [])
    } else {
      setLoadError(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const res = await fetch('/api/expense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ date: new Date().toISOString().slice(0, 10), amount: '', category: 'platform', description: '', recurring: false, recurring_frequency: 'monthly', note: '' })
      await load()
    } else {
      setSaveError('儲存失敗，請重試（GitHub API 異常）')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('確定刪除這筆支出記錄？')) return
    await fetch('/api/expense', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await load()
  }

  const total = transactions.reduce((s, t) => s + t.amount, 0)
  const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">支出流水帳</h1>
          <p className="text-gray-400 text-sm mt-1">
            合計 <span className="text-orange-400 font-semibold">NT${total.toLocaleString()}</span>　共 {transactions.length} 筆
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + 新增支出
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-white">新增支出記錄</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">日期 *</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" required />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">金額（NT$）*</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="3200" required />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">類別</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">說明 *</label>
              <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="Claude Code Max 5x" required />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input type="checkbox" checked={form.recurring} onChange={e => setForm({...form, recurring: e.target.checked})} className="w-4 h-4" />
              固定支出（每月/每年）
            </label>
            {form.recurring && (
              <select value={form.recurring_frequency} onChange={e => setForm({...form, recurring_frequency: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm">
                <option value="monthly">每月</option>
                <option value="yearly">每年</option>
              </select>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">備註</label>
            <input type="text" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="（選填）" />
          </div>
          {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {saving ? '儲存中...' : '確認新增'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2 transition-colors">取消</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm">載入中...</div>
      ) : loadError ? (
        <div className="text-red-400 text-sm text-center py-12">⚠️ 資料載入失敗，請重新整理頁面</div>
      ) : transactions.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-12">還沒有支出記錄，點「+ 新增支出」開始記帳</div>
      ) : (
        <div className="space-y-2">
          {transactions.map(t => (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="text-sm text-gray-400 w-24">{t.date}</div>
              <div className="flex-1">
                <span className="text-white font-medium">{t.description}</span>
                {t.note && <span className="text-gray-500 text-xs ml-2">· {t.note}</span>}
              </div>
              <div className="text-xs text-gray-500">{catLabel(t.category)}</div>
              {t.recurring && (
                <div className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {t.recurring_frequency === 'monthly' ? '每月' : '每年'}
                </div>
              )}
              <div className="text-sm font-semibold text-orange-400 w-20 text-right">
                NT${t.amount.toLocaleString()}
              </div>
              <button onClick={() => handleDelete(t.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">刪除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
