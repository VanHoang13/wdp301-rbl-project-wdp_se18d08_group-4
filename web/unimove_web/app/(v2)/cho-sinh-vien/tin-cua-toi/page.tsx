'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tag, ShoppingBag, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ListingCard, type ListingCardData, type ListingStatus } from '@/components/cards/ListingCard'
import { ErrorState } from '@/components/shared/ErrorState'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { useMarketplaceStore, type MyListingsSubtab } from '@/lib/stores/useMarketplaceStore'
import { useUIStore } from '@/lib/stores/useUIStore'
import { marketplaceApi } from '@/lib/api'
import type { AsyncState } from '@/lib/types/states'

const PRIMARY = '#1E40AF'
const ACCENT  = '#FACC15'

interface ApiListing {
  id: string; title: string; price?: number; status: string; condition?: string
  images?: string[]; view_count?: number; interest_count?: number
  created_at?: string; expires_at?: string; fee_paid?: boolean
}

function apiStatusToListingStatus(l: ApiListing): ListingStatus {
  const s = l.status
  if (s === 'sold' || s === 'completed') return 'da-ban'
  if (s === 'hidden' && l.fee_paid === false) return 'chua-kich-hoat'
  if (s === 'hidden')                    return 'da-an'
  if (s === 'expired')                   return 'het-han'
  return 'dang-ban'
}

function toListing(l: ApiListing): ListingCardData {
  return {
    id:        l.id,
    title:     l.title,
    price:     l.price ?? 0,
    status:    apiStatusToListingStatus(l),
    condition: l.condition as ListingCardData['condition'],
    imageUrl:  l.images?.[0],
    views:     l.view_count,
    saves:     l.interest_count,
    postedAt:  l.created_at,
    expiresAt: l.expires_at,
  }
}

/* ── Subtab bar ─────────────────────────────────────────────── */

const SUBTABS: { key: MyListingsSubtab; label: string }[] = [
  { key: 'dang-ban', label: 'Đang bán' },
  { key: 'da-ban',   label: 'Đã bán' },
  { key: 'da-an',    label: 'Đã ẩn' },
]

function SubtabBar({
  active,
  onChange,
}: {
  active:   MyListingsSubtab
  onChange: (t: MyListingsSubtab) => void
}) {
  return (
    <div className="flex gap-1.5 px-4 py-3 border-b border-gray-100 bg-white" role="tablist">
      {SUBTABS.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          className="flex-1 py-2 text-center text-[13px] font-semibold rounded-lg transition-all"
          style={
            active === key
              ? { backgroundColor: PRIMARY, color: '#FFFFFF' }
              : { backgroundColor: '#F1F5F9', color: '#64748B' }
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/* ── Skeleton ───────────────────────────────────────────────── */

function SkeletonListingCard() {
  return (
    <div className="flex gap-3 bg-white rounded-xl border border-gray-100 p-3">
      <div className="w-20 h-20 rounded-xl bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3.5 bg-gray-100 rounded animate-pulse w-4/5" />
        <div className="h-3.5 bg-gray-100 rounded animate-pulse w-3/5" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-2/5 mt-1" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
      </div>
    </div>
  )
}

/* ── Empty states ───────────────────────────────────────────── */

const EMPTY_CONFIG: Record<MyListingsSubtab, {
  icon:  React.ElementType
  bg:    string
  color: string
  title: string
  desc:  string
  cta?:  { label: string; href: string }
}> = {
  'dang-ban': {
    icon: Tag, bg: '#EFF6FF', color: PRIMARY,
    title: 'Chưa có tin đang bán',
    desc:  'Đăng tin ngay để bán đồ dùng sinh viên của bạn!',
    cta:   { label: 'Đăng tin ngay', href: '/cho-sinh-vien/dang-ban' },
  },
  'da-ban': {
    icon: ShoppingBag, bg: '#F0FDF4', color: '#16A34A',
    title: 'Chưa có tin đã bán',
    desc:  'Các tin bạn đánh dấu đã bán sẽ hiện ở đây.',
  },
  'da-an': {
    icon: EyeOff, bg: '#F8FAFC', color: '#64748B',
    title: 'Chưa có tin đã ẩn',
    desc:  'Các tin bạn ẩn khỏi chợ sẽ hiện ở đây.',
  },
}

function EmptyListings({ subtab }: { subtab: MyListingsSubtab }) {
  const cfg  = EMPTY_CONFIG[subtab]
  const Icon = cfg.icon
  return (
    <div className="mx-4 mt-4 py-14 text-center bg-white rounded-xl border border-gray-100">
      <div
        className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
        style={{ backgroundColor: cfg.bg }}
      >
        <Icon size={40} style={{ color: cfg.color }} />
      </div>
      <p className="text-lg font-extrabold text-gray-900 mb-2">{cfg.title}</p>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">{cfg.desc}</p>
      {cfg.cta && (
        <a href={cfg.cta.href}>
          <button
            className="px-6 py-2.5 rounded-lg font-bold text-sm text-gray-900 shadow-sm transition-all hover:brightness-95 active:scale-[0.97]"
            style={{ backgroundColor: ACCENT }}
          >
            {cfg.cta.label}
          </button>
        </a>
      )}
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────── */

export default function TinCuaToiPage() {
  const subtab      = useMarketplaceStore((s) => s.myListingsSubtab)
  const setSubtab   = useMarketplaceStore((s) => s.setMyListingsSubtab)
  const showSuccess = useUIStore((s) => s.showSuccess)
  const showError   = useUIStore((s) => s.showError)

  const [state,      setState]      = useState<AsyncState<ListingCardData[]>>({ status: 'loading' })
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const res = await marketplaceApi.myListings()
      if (res.success) {
        const raw: ApiListing[] = Array.isArray(res.data)
          ? (res.data as ApiListing[])
          : ((res.data as { listings?: ApiListing[] })?.listings ?? [])
        setState({ status: 'success', data: raw.map(toListing) })
      } else {
        setState({ status: 'error', error: 'Không tải được tin của bạn.' })
      }
    } catch {
      setState({ status: 'error', error: 'Lỗi kết nối. Vui lòng thử lại.' })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = state.status === 'success'
    ? state.data.filter((l) => {
        if (subtab === 'dang-ban') return l.status === 'dang-ban' || l.status === 'het-han' || l.status === 'chua-kich-hoat'
        if (subtab === 'da-ban')   return l.status === 'da-ban'
        if (subtab === 'da-an')    return l.status === 'da-an'
        return true
      })
    : []

  const handleActivate = async (id: string) => {
    try {
      const pay = await marketplaceApi.payListingFee(id, { payment_method: 'dev_bypass' })
      const activated = (pay.data as { activated?: boolean })?.activated
      if (activated || (pay.data as { already_paid?: boolean })?.already_paid) {
        showSuccess('Tin đã được kích hoạt và hiển thị trên chợ!')
        load()
        return
      }
      // Fallback: nếu backend trả checkout_url thì redirect PayOS
      const checkout = (pay.data as { checkout_url?: string })?.checkout_url
      if (checkout) { window.location.href = checkout; return }
      showError('Không kích hoạt được. Thử lại sau.')
    } catch {
      showError('Lỗi khi kích hoạt tin.')
    }
  }

  const handleMarkSold = async (id: string) => {
    try { await marketplaceApi.updateStatus(id, 'sold'); showSuccess('Đã đánh dấu đã bán'); load() }
    catch { showError('Không thể cập nhật trạng thái') }
  }

  const handleHide = async (id: string) => {
    try { await marketplaceApi.updateStatus(id, 'hidden'); showSuccess('Đã ẩn tin'); load() }
    catch { showError('Không thể ẩn tin') }
  }

  const handleUnhide = async (id: string) => {
    try { await marketplaceApi.updateStatus(id, 'active'); showSuccess('Đã hiện tin lại'); load() }
    catch { showError('Không thể hiện tin') }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await marketplaceApi.updateStatus(deleteId, 'hidden')
      showSuccess('Đã xoá tin')
      setDeleteId(null)
      load()
    } catch {
      showError('Không thể xoá tin')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: '#FAFAFA' }}>
      <SubtabBar active={subtab} onChange={setSubtab} />

      <div className="pb-6 pt-3">
        {state.status === 'loading' && (
          <div className="flex flex-col gap-3 px-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonListingCard key={i} />)}
          </div>
        )}

        {state.status === 'error' && (
          <ErrorState type="network" message={state.error as string} onRetry={load} className="mt-8" />
        )}

        {state.status === 'success' && filtered.length === 0 && (
          <EmptyListings subtab={subtab} />
        )}

        {state.status === 'success' && filtered.length > 0 && (
          <div className="flex flex-col gap-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{filtered.length} tin</span>
            </div>
            {filtered.map((l) => (
              <ListingCard
                key={l.id}
                data={l}
                onMarkSold={handleMarkSold}
                onHide={handleHide}
                onUnhide={handleUnhide}
                onActivate={handleActivate}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Xoá tin này?"
        description="Tin sẽ bị xoá vĩnh viễn và không thể khôi phục lại."
        confirmLabel="Xoá tin"
        cancelLabel="Huỷ"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}