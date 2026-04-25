'use client'

import { useState, useEffect, useCallback } from 'react'
import { Subscription } from '@/lib/github'
import { DeleteModal } from '@/app/_components/DeleteModal'

const CATEGORIES = [
  { value: 'ai', label: 'AI 工具' },
  { value: 'platform', label: '平台' },
  { value: 'domain', label: '網域' },
  { value: 'tool', label: '工具' },
  { value: 'storage', label: '儲存空間' },
  { value: 'other', label: '其他' },
]

const BILLING_CYCLES = [
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
  { value: 'one-time', label: '一次性' },
  { value: 'free', label: '免費' },
]

const TYPE_LABELS: Record<string, string> = { paid: '付費', free: '免費', trial: '試用中' }
const CAT_LABELS: Record<string, string> = {
  ai: 'AI 工具', platform: '平台', domain: '網域', tool: '工具', storage: '儲存空間', other: '其他'
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [form, setForm] = useState({
    name: '',
    category: 'platform',
    type: 'free',
    cost: '',
    billing_cycle: 'free',
    renewal_date: '',
    status: 'active',
    watch_pricing: false,
    url: '',
    note: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    const res = await fetch('/api/subscriptions')
    if (res.ok) {
      const data = await res.json()
      setSubscriptions(data.subscriptions ?? [])
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
    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, cost: Number(form.cost || 0), renewal_date: form.renewal_date || null }),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ name: '', category: 'platform', type: 'free', cost: '', billing_cycle: 'free', renewal_date: '', status: 'active', watch_pricing: false, url: '', note: '' })
      await load()
    } else {
      setSaveError('儲存失敗，請重試')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch('/api/subscriptions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setDeleteTarget(null)
    await load()
  }

  // Derived data
  const active = subscriptions.filter(s => s.status === 'active')
  const paid = active.filter(s => s.type === 'paid')
  const trials = active.filter(s => s.type === 'trial')
  const free = active.filter(s => s.type === 'free')

  const monthlyTotal = paid.filter(s => s.billing_cycle === 'monthly').reduce((sum, s) => sum + s.cost, 0)
  const yearlyTotal = paid.filter(s => s.billing_cycle === 'yearly').reduce((sum, s) => sum + s.cost, 0)

  const expiringSoon = active
    .filter(s => s.renewal_date !== null)
    .map(s => ({ ...s, days: daysUntil(s.renewal_date!) }))
    .filter(s => s.days <= 30)
    .sort((a, b) => a.days - b.days)

  return (
    <div className="space-y-6">
      {deleteTarget && (
        <DeleteModal
          message={`確定刪除「${deleteTarget.label}」？此動作無法還原。`}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">訂閱與工具管理</h1>
          <p className="text-gray-400 text-sm mt-1">
            月費 <span className="text-orange-400 font-semibold">NT${monthlyTotal.toLocaleString()}</span>
            　年費 <span className="text-orange-400 font-semibold">NT${yearlyTotal.toLocaleString()}</span>
            　共 {active.length} 個工具
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + 新增工具
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-white">新增工具 / 訂閱</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 block mb-1">名稱 *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="Vercel Hobby" required />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">類別</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">類型</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                <option value="free">免費</option>
                <option value="paid">付費</option>
                <option value="trial">試用中</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">費用（NT$）</label>
              <input type="number" min="0" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">計費週期</label>
              <select value={form.billing_cycle} onChange={e => setForm({ ...form, billing_cycle: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {BILLING_CYCLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">到期日（年費/試用才填）</label>
              <input type="date" value={form.renewal_date} onChange={e => setForm({ ...form, renewal_date: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">網址</label>
              <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="https://" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input type="checkbox" checked={form.watch_pricing} onChange={e => setForm({ ...form, watch_pricing: e.target.checked })} className="w-4 h-4" />
              定價異動監控（免費工具但擔心未來收費）
            </label>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">備註</label>
            <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="（選填）" />
          </div>
          {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
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
      ) : (
        <div className="space-y-6">

          {/* Expiring soon */}
          {expiringSoon.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-yellow-400 mb-3">⚠️ 30 天內到期</h2>
              <div className="space-y-2">
                {expiringSoon.map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-white text-sm font-medium">{s.name}</span>
                    <span className="text-yellow-400 text-xs">{s.renewal_date}</span>
                    <span className="text-gray-500 text-xs">（{s.days <= 0 ? '已到期' : `還有 ${s.days} 天`}）</span>
                    {s.type === 'trial' && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-300">試用到期</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paid & Trial */}
          {(paid.length > 0 || trials.length > 0) && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">付費 / 試用中</h2>
              <div className="space-y-2">
                {[...trials, ...paid].map(s => (
                  <SubscriptionRow key={s.id} s={s} onDelete={setDeleteTarget} />
                ))}
              </div>
            </div>
          )}

          {/* Free tools */}
          {free.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">免費工具</h2>
              <div className="space-y-2">
                {free.map(s => (
                  <SubscriptionRow key={s.id} s={s} onDelete={setDeleteTarget} />
                ))}
              </div>
            </div>
          )}

          {active.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-12">還沒有工具記錄，點「+ 新增工具」開始建立資產清單</div>
          )}
        </div>
      )}
    </div>
  )
}

function SubscriptionRow({ s, onDelete }: {
  s: Subscription
  onDelete: (t: { id: string; label: string }) => void
}) {
  const billingLabel = s.billing_cycle === 'monthly' ? '/月' : s.billing_cycle === 'yearly' ? '/年' : s.billing_cycle === 'one-time' ? '一次性' : ''

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm">{s.name}</span>
          {s.watch_pricing && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">定價監控</span>
          )}
          {s.type === 'trial' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900 text-blue-300">試用中</span>
          )}
        </div>
        {s.note && <p className="text-xs text-gray-500 mt-0.5">{s.note}</p>}
      </div>
      <div className="text-xs text-gray-500">{CAT_LABELS[s.category] ?? s.category}</div>
      {s.renewal_date && (
        <div className="text-xs text-gray-500 w-24 text-right">{s.renewal_date}</div>
      )}
      <div className="text-sm font-semibold w-28 text-right">
        {s.cost === 0 ? (
          <span className="text-gray-500">免費</span>
        ) : (
          <span className="text-orange-400">NT${s.cost.toLocaleString()}{billingLabel}</span>
        )}
      </div>
      <button
        onClick={() => onDelete({ id: s.id, label: s.name })}
        className="text-gray-600 hover:text-red-400 text-xs transition-colors"
      >
        刪除
      </button>
    </div>
  )
}
