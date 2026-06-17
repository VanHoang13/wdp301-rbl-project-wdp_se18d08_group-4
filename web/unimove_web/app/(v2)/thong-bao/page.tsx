'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, Package, Star, AlertCircle, CheckCircle, RefreshCw, CheckCheck } from 'lucide-react'
import { notificationsApi } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import { useNotificationStore } from '@/lib/stores'

const BRAND = '#1E40AF'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  message?: string
  read?: boolean
  is_read?: boolean
  created_at: string
  href?: string
}

function mapType(t: string): 'order' | 'promo' | 'system' | 'review' {
  if (t?.includes('order') || t?.includes('quote') || t?.includes('don')) return 'order'
  if (t?.includes('review') || t?.includes('rating')) return 'review'
  if (t?.includes('promo') || t?.includes('market')) return 'promo'
  return 'system'
}

const TYPE_META = {
  order:  { icon: Package,      bg: '#EFF6FF', color: BRAND },
  promo:  { icon: Star,         bg: '#FFFBEB', color: '#D97706' },
  system: { icon: AlertCircle,  bg: '#F0FDF4', color: '#16A34A' },
  review: { icon: CheckCircle,  bg: '#FFF1F2', color: '#E11D48' },
}

function SkeletonItem() {
  return (
    <div className="flex gap-3 items-center px-4 py-3.5 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-40 rounded bg-gray-100" />
        <div className="h-3 w-full rounded bg-gray-100" />
      </div>
    </div>
  )
}

export default function ThongBaoPage() {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const [notifs, setNotifs]       = useState<Notification[]>([])
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await notificationsApi.list({ pageSize: 100 })
      if (r.success && r.data) {
        const d = r.data as { notifications?: Notification[] } | Notification[]
        setNotifs(Array.isArray(d) ? d : (d?.notifications ?? []))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const markRead = async (n: Notification) => {
    const unread = !(n.read ?? n.is_read)
    if (!unread) return
    await notificationsApi.markRead(n.id)
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true, is_read: true } : x))
    setUnreadCount(Math.max(0, notifs.filter(x => !(x.read ?? x.is_read)).length - 1))
  }

  const markAll = async () => {
    await notificationsApi.markAllRead()
    setNotifs(prev => prev.map(x => ({ ...x, read: true, is_read: true })))
    setUnreadCount(0)
  }

  const unreadCount = notifs.filter(n => !(n.read ?? n.is_read)).length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">Thông báo</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-400">{unreadCount} chưa đọc</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={markAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-50"
              style={{ color: BRAND }}
            >
              <CheckCheck size={14} />
              Đọc tất cả
            </button>
          )}
          <button
            onClick={load}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y divide-gray-50 bg-white mt-3 mx-3 rounded-xl overflow-hidden border border-gray-100">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonItem key={i} />)}
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mb-5">
            <Bell size={36} className="text-gray-200" />
          </div>
          <p className="font-bold text-gray-700 mb-1">Chưa có thông báo</p>
          <p className="text-sm text-gray-400">Các cập nhật đơn hàng và tin tức sẽ hiện ở đây</p>
        </div>
      ) : (
        <div className="mt-3 mx-3 rounded-xl overflow-hidden bg-white border border-gray-100 divide-y divide-gray-50">
          {notifs.map((n) => {
            const kind   = mapType(n.type)
            const meta   = TYPE_META[kind]
            const Icon   = meta.icon
            const unread = !(n.read ?? n.is_read)
            return (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors"
                style={{ borderLeft: unread ? `3px solid ${BRAND}` : '3px solid transparent' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: meta.bg, color: meta.color }}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm truncate ${unread ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-gray-300 shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body || n.message}</p>
                </div>
                {unread && (
                  <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: BRAND }} />
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="h-6" />
    </div>
  )
}
