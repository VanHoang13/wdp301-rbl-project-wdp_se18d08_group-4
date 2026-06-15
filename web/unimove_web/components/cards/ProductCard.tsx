'use client'

import Link from 'next/link'
import { Heart, MapPin, Tag } from 'lucide-react'
import { useMarketplaceStore, CONDITION_LABELS } from '@/lib/stores/useMarketplaceStore'

/* ── Types ──────────────────────────────────────────────────── */

export interface ProductCardData {
  id:            string
  title:         string
  price:         number
  isNegotiable?: boolean
  condition?:    string
  location?:     string
  imageUrl?:     string
  postedAt?:     string
  isUrgent?:     boolean
  created_at?:   string
  seller_name?:  string
}

const PRIMARY = '#1E40AF'

function formatPrice(price: number) {
  if (price === 0) return 'Miễn phí'
  return new Intl.NumberFormat('vi-VN').format(price) + ' đ'
}

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'vừa xong'
  if (m < 60) return `${m}ph`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}ng`
}

function isNewListing(created_at?: string): boolean {
  if (!created_at) return false
  return Date.now() - new Date(created_at).getTime() < 24 * 60 * 60 * 1000
}

/* ── Save button ────────────────────────────────────────────── */

function SaveButton({ id, className }: { id: string; className?: string }) {
  const isSaved    = useMarketplaceStore((s) => s.isSaved(id))
  const toggleSave = useMarketplaceStore((s) => s.toggleSave)

  return (
    <button
      type="button"
      aria-label={isSaved ? 'Bỏ lưu' : 'Lưu tin'}
      aria-pressed={isSaved}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleSave(id)
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:scale-110 active:scale-90 ${className ?? ''}`}
    >
      <Heart
        size={14}
        strokeWidth={2}
        className={isSaved ? 'fill-red-500 stroke-red-500' : 'stroke-gray-500'}
      />
    </button>
  )
}

/* ── Grid variant (redesigned) ──────────────────────────────── */

function GridCard({ data, href = '#' }: { data: ProductCardData; href?: string }) {
  const sellerInitial  = data.seller_name?.[0]?.toUpperCase() ?? '?'
  const sellerShort    = data.seller_name ? data.seller_name.split(' ').pop()! : null
  const conditionLabel = data.condition
    ? (CONDITION_LABELS[data.condition as keyof typeof CONDITION_LABELS] ?? data.condition)
    : null
  const showNewBadge = isNewListing(data.created_at)

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl bg-white border border-gray-100 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Image 1:1 */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {data.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.imageUrl}
            alt={data.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl select-none">📦</div>
        )}

        {/* Badges top-left */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {showNewBadge && (
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white leading-none"
              style={{ backgroundColor: PRIMARY }}>
              Mới
            </span>
          )}
          {data.isUrgent && (
            <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              Gấp
            </span>
          )}
        </div>

        {/* Heart top-right */}
        <SaveButton id={data.id} className="absolute right-2 top-2" />
      </div>

      {/* Card body */}
      <div className="flex flex-col p-2.5 gap-1.5">
        {/* Title — 2 lines, 13px medium */}
        <p className="line-clamp-2 text-[13px] font-medium text-gray-900 leading-snug min-h-[2.5rem]">
          {data.title}
        </p>

        {/* Price — 17px bold, primary */}
        <p className="text-[17px] font-extrabold leading-none" style={{ color: PRIMARY }}>
          {formatPrice(data.price)}
          {data.isNegotiable && (
            <span className="ml-1 text-xs font-normal text-gray-400">• TL</span>
          )}
        </p>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Condition + Location */}
        {(conditionLabel || data.location) && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate">
            {conditionLabel && (
              <span className="flex items-center gap-0.5 shrink-0">
                <Tag size={9} />
                {conditionLabel}
              </span>
            )}
            {conditionLabel && data.location && (
              <span className="text-gray-300">·</span>
            )}
            {data.location && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin size={9} />
                {data.location}
              </span>
            )}
          </div>
        )}

        {/* Seller row */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          {/* Avatar circle */}
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
            style={{ backgroundColor: PRIMARY }}
          >
            {sellerInitial}
          </div>
          {sellerShort && <span className="truncate max-w-[60px]">{sellerShort}</span>}
          {(data.created_at || data.postedAt) && (
            <>
              {sellerShort && <span className="text-gray-200">·</span>}
              <span className="shrink-0">
                {data.created_at ? `${timeAgoShort(data.created_at)} trước` : data.postedAt}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

/* ── Horizontal variant ─────────────────────────────────────── */

function HorizontalCard({ data, href = '#' }: { data: ProductCardData; href?: string }) {
  return (
    <Link
      href={href}
      className="group flex gap-3 overflow-hidden rounded-xl bg-white border border-gray-100 p-3 transition-all hover:shadow-md active:scale-[0.99]"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50">
        {data.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.imageUrl} alt={data.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl select-none">📦</div>
        )}
        {data.isUrgent && (
          <span className="absolute bottom-0 left-0 right-0 bg-red-500/90 text-center text-[9px] font-semibold text-white py-0.5">
            Gấp
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug">{data.title}</p>
        <div className="mt-1 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: PRIMARY }}>
              {formatPrice(data.price)}
              {data.isNegotiable && <span className="ml-1 text-xs font-normal text-gray-400">TL</span>}
            </p>
            {data.location && (
              <p className="text-xs text-gray-400 line-clamp-1">{data.location}</p>
            )}
          </div>
          <SaveButton id={data.id} className="-mb-0.5 -mr-0.5" />
        </div>
      </div>
    </Link>
  )
}

/* ── Export ─────────────────────────────────────────────────── */

export function ProductCard({
  data,
  variant = 'grid',
  href,
  className,
}: {
  data:       ProductCardData
  variant?:   'grid' | 'horizontal'
  href?:      string
  className?: string
}) {
  return (
    <div className={className}>
      {variant === 'grid'
        ? <GridCard       data={data} href={href} />
        : <HorizontalCard data={data} href={href} />
      }
    </div>
  )
}