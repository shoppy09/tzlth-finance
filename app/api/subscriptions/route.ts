import { NextRequest, NextResponse } from 'next/server'
import { getSubscriptions, saveSubscriptions, Subscription } from '@/lib/github'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

function checkAuth(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  return verifyToken(token ?? '')
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await getSubscriptions()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data = await getSubscriptions()

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `SUB-${dateStr}-`
  const existing = data.subscriptions
    .filter(s => s.id.startsWith(prefix))
    .map(s => parseInt(s.id.replace(prefix, ''), 10))
  const maxSeq = existing.length > 0 ? Math.max(...existing) : 0

  const sub: Subscription = {
    id: `SUB-${dateStr}-${String(maxSeq + 1).padStart(3, '0')}`,
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
  const ok = await saveSubscriptions(data)
  return NextResponse.json({ ok, id: sub.id }, { status: ok ? 201 : 500 })
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, ...updates } = body
  const data = await getSubscriptions()
  const sub = data.subscriptions.find(s => s.id === id)
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  Object.assign(sub, updates)
  const ok = await saveSubscriptions(data)
  return NextResponse.json({ ok })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const data = await getSubscriptions()
  data.subscriptions = data.subscriptions.filter(s => s.id !== id)
  const ok = await saveSubscriptions(data)
  return NextResponse.json({ ok })
}
