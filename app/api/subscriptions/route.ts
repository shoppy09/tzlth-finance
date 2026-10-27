import { NextRequest, NextResponse } from 'next/server'
import { getSubscriptionsStrict, updateSubscriptions, ledgerErrorInfo, Subscription, nextId, recordDeletedId } from '@/lib/github'
import { taipeiToday } from '@/lib/tw-date'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

function checkAuth(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  return verifyToken(token ?? '')
}

// 讀寫失敗一律回錯誤碼（2026-10-10 HQ「寫入失敗審查結果（10-08）」⑥），不再把失敗當成空清單
function fail(e: unknown) {
  const { status, error } = ledgerErrorInfo(e)
  return NextResponse.json({ ok: false, error }, { status })
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await getSubscriptionsStrict())
  } catch (e) {
    return fail(e)
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  try {
    // 衝突重試時 mutate 會用最新清單重跑 ⇒ 編號每次重算
    const id = await updateSubscriptions(data => {
      // 編號日期用台北今天；刪過的編號不重用（2026-10-27）
      const dateStr = taipeiToday().replace(/-/g, '')

      const sub: Subscription = {
        id: nextId(`SUB-${dateStr}`, data.subscriptions.map(s => s.id), data._seq_floor),
        name: body.name ?? '',
        category: body.category ?? 'other',
        type: body.type ?? 'free',
        cost: Number(body.cost ?? 0),
        billing_cycle: body.billing_cycle ?? 'free',
        renewal_date: body.renewal_date ?? null,
        status: body.status ?? 'active',
        watch_pricing: Boolean(body.watch_pricing ?? false),
        url: body.url ?? '',
        note: body.note ?? '',
        created_at: new Date().toISOString(),
      }

      data.subscriptions.push(sub)
      return sub.id
    })
    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch (e) {
    return fail(e)
  }
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id } = body
  // 只收可編輯欄位（2026-10-27）：原本整包 Object.assign，連 id／created_at 都能被改掉
  const EDITABLE = ['name', 'category', 'type', 'cost', 'billing_cycle', 'renewal_date', 'status', 'watch_pricing', 'url', 'note'] as const
  const updates = Object.fromEntries(EDITABLE.filter(k => k in body).map(k => [k, body[k]]))
  try {
    const done = await updateSubscriptions(data => {
      const sub = data.subscriptions.find(s => s.id === id)
      if (!sub) return null
      Object.assign(sub, updates)
      return true
    })
    if (done === null) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  try {
    const done = await updateSubscriptions(data => {
      const before = data.subscriptions.length
      data.subscriptions = data.subscriptions.filter(s => s.id !== id)
      if (data.subscriptions.length === before) return null
      recordDeletedId(data, id)
      return true
    })
    if (done === null) return NextResponse.json({ ok: false, error: '找不到這筆訂閱（可能已刪除）' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e)
  }
}
