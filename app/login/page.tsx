'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('PIN 錯誤，請重試')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-white mb-2">職涯停看聽</h1>
        <p className="text-gray-400 text-sm mb-6">財務系統 · 登入</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="輸入 PIN 碼"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-lg tracking-widest focus:outline-none focus:border-blue-500"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || pin.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg py-3 font-medium transition-colors"
          >
            {loading ? '驗證中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  )
}
