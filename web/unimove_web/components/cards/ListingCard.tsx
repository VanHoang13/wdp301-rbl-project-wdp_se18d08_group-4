'use client'

import Link from 'next/link'
import { MoreVertical, Pencil, CheckCircle, Eye, EyeOff, Trash2, RefreshCw, Zap } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ListingCondition } from '@/lib/stores/useMarketplaceStore'
import { CONDITION_LABELS } from '@/lib/stores/useMarketplaceStore'

/* ── Types ──────────────────────────────────────────────────── */

export type ListingStatus = 'dang-ban' | 'da-ban' | 'da-an' | 'het-han' | 'chua-kich-hoat'

export interface ListingCardData {
  id:        string
  title:     string
  price:     number
  status:    ListingStatus
  condition?: ListingCondition
  imageUrl?: string
  views?:    number
  saves?:    number
  postedAt?: string
  expiresAt?: string
}

interface ListingCardProps {
  data:          ListingCardData
  onEdit?:       (id: string) => void
  onMarkSold?:   (id: string) => void
  onHide?:       (id: string) => void
  onUnhide?:     (id: string) => void
  onRenew?:      (id: string) => void
  onDelete?:     (id: string) => void
  onActivate?:   (id: string) => void
  className?:    string
}

/* ── Status config ──────────────────────────────────────────── */

const STATUS_CONFIG: Record<ListingStatus, { label: string; className: string }> = {
  'dang-ban':        { label: 'Đang bán',         className: 'bg-green-100 text-green-700' },
  'da-ban':          { label: 'Đã bán',            className: 'bg-gray-100 text-gray-500' },
  'da-an':           { label: 'Đã ẩn',             className: 'bg-yellow-50 text-yellow-700' },
  'het-han':         { label: 'Hết hạn',           className: 'bg-red-50 text-red-600' },
  'chua-kich-hoat':  { label: 'Chưa kích hoạt',   className: 'bg-orange-100 text-orange-700' },
}

function formatPrice(price: number) {
  if (price === 0) return 'Miễn phí'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(price)
}

/* ── Action menu ────────────────────────────────────────────── */

interface ActionMenuProps {
  data:        ListingCardData
  onEdit?:     (id: string) => void
  onMarkSold?: (id: string) => void
  onHide?:     (id: string) => void
  onUnhide?:   (id: string) => void
  onRenew?:    (id: string) => void
  onDelete?:   (id: string) => void
  onActivate?: (id: string) => void
}

function ActionMenu({ data, onEdit, onMarkSold, onHide, onUnhide, onRenew, onDelete, onActivate }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const actions = [
    data.status === 'chua-kich-hoat' && onActivate && { icon: Zap,         label: 'Kích hoạt tin',       fn: () => onActivate(data.id), className: 'text-orange-600' },
    data.status === 'dang-ban' && onEdit     && { icon: Pencil,      label: 'Chỉnh sửa',        fn: () => onEdit(data.id),     className: '' },
    data.status === 'dang-ban' && onMarkSold && { icon: CheckCircle, label: 'Đánh dấu đã bán',  fn: () => onMarkSold(data.id), className: 'text-success' },
    data.status === 'dang-ban' && onHide     && { icon: EyeOff,      label: 'Ẩn tin',            fn: () => onHide(data.id),     className: '' },
    data.status === 'da-an'   && onUnhide   && { icon: Eye,         label: 'Hiện tin lại',      fn: () => onUnhide(data.id),   className: '' },
    (data.status === 'het-han' || data.status === 'da-an') && onRenew && {
      icon: RefreshCw, label: 'Gia hạn tin', fn: () => onRenew(data.id), className: 'text-primary',
    },
    onDelete && { icon: Trash2, label: 'Xoá tin', fn: () => onDelete(data.id), className: 'text-error' },
  ].filter(Boolean) as Array<{
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
    label: string
    fn: () => void
    className: string
  }>

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Tuỳ chọn"
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v) }}
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-2"
      >
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-dropdown min-w-[160px] overflow-hidden rounded-xl bg-surface shadow-lg border border-border animate-scale-in">
          {actions.map(({ icon: Icon, label, fn, className }) => (
            <button
              key={label}
              type="button"
              onClick={() => { fn(); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2',
                className
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Card ───────────────────────────────────────────────────── */

export function ListingCard({
  data, onEdit, onMarkSold, onHide, onUnhide, onRenew, onDelete, onActivate, className,
}: ListingCardProps) {
  const { label: statusLabel, className: statusClass } = STATUS_CONFIG[data.status]

  return (
    <div className={cn('rounded-card bg-surface shadow-card overflow-hidden', className)}>
      {data.status === 'chua-kich-hoat' && (
        <div className="flex items-center justify-between gap-2 bg-orange-50 border-b border-orange-100 px-3 py-2">
          <p className="text-xs font-semibold text-orange-700">⚡ Tin chưa kích hoạt — cần thanh toán phí để hiển thị</p>
          {onActivate && (
            <button
              type="button"
              onClick={() => onActivate(data.id)}
              className="shrink-0 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold text-white hover:bg-orange-600 transition-colors"
            >
              Kích hoạt
            </button>
          )}
        </div>
      )}
      <div className="flex gap-3 p-3">
      {/* Image */}
      <Link href={`/cho-sinh-vien/${data.id}`} className="shrink-0">
        <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-surface-2">
          {data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.imageUrl} alt={data.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">📦</div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/cho-sinh-vien/${data.id}`} className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium text-foreground leading-snug">{data.title}</p>
          </Link>
          <ActionMenu
            data={data}
            onEdit={onEdit}
            onMarkSold={onMarkSold}
            onHide={onHide}
            onUnhide={onUnhide}
            onRenew={onRenew}
            onDelete={onDelete}
            onActivate={onActivate}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1">
          <p className="text-sm font-bold text-primary">{formatPrice(data.price)}</p>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusClass)}>
            {statusLabel}
          </span>
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          {data.views !== undefined && <span>{data.views} lượt xem</span>}
          {data.saves !== undefined && <span>{data.saves} lượt lưu</span>}
          {data.condition && (
            <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px]">
              {CONDITION_LABELS[data.condition]}
            </span>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
