'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Search, SlidersHorizontal, X, ChevronDown, Clock, Flame, Armchair, Smartphone, BookOpen, Shirt, ChefHat, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProductCard, type ProductCardData } from '@/components/cards/ProductCard'
import { ErrorState } from '@/components/shared/ErrorState'
import {
  useMarketplaceStore,
  CATEGORY_LABELS,
  SORT_LABELS,
  type ListingCategory,
  type SortOption,
} from '@/lib/stores/useMarketplaceStore'
import { marketplaceApi } from '@/lib/api'
import type { AsyncState } from '@/lib/types/states'

/* ── Types ──────────────────────────────────────────────────── */

interface ApiListing {
  id:          string
  title:       string
  price?:      number
  category:    string
  condition?:  string
  city?:       string
  status:      string
  images?:     string[]
  created_at:  string
  is_urgent?:  boolean
  seller?:     { full_name?: string }
}

function toListing(l: ApiListing): ProductCardData {
  return {
    id:          l.id,
    title:       l.title,
    price:       l.price ?? 0,
    isNegotiable: false,
    condition:   l.condition,
    location:    l.city,
    imageUrl:    l.images?.[0],
    isUrgent:    l.is_urgent,
    created_at:  l.created_at,
    seller_name: l.seller?.full_name,
  }
}

const PRIMARY = '#1E40AF'
const ACCENT  = '#FACC15'

/* ── Skeleton card ──────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-white border border-gray-100">
      <div className="aspect-square bg-gray-100 animate-pulse" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-gray-100 rounded animate-pulse w-5/6" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-2/5 mt-1" />
        <div className="border-t border-gray-50 my-1" />
        <div className="h-2.5 bg-gray-100 rounded animate-pulse w-4/6" />
        <div className="h-2.5 bg-gray-100 rounded animate-pulse w-3/6" />
      </div>
    </div>
  )
}

/* ── Sort dropdown ──────────────────────────────────────────── */

const SORT_OPTIONS: SortOption[] = ['moi-nhat', 'gia-tang', 'gia-giam', 'gan-nhat']
const SORT_SHORT: Record<SortOption, string> = {
  'moi-nhat': 'Mới nhất',
  'gia-tang': 'Giá ↑',
  'gia-giam': 'Giá ↓',
  'gan-nhat': 'Gần nhất',
}

function SortDropdown({
  value,
  onChange,
}: {
  value:    SortOption
  onChange: (s: SortOption) => void
}) {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-gray-300 transition-colors"
      >
        {SORT_SHORT[value]}
        <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-36 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false) }}
              className={cn(
                'w-full px-3 py-2.5 text-xs font-medium text-left transition-colors',
                value === opt
                  ? 'text-white font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
              style={value === opt ? { backgroundColor: PRIMARY } : undefined}
            >
              {SORT_LABELS[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Search bar with recent search dropdown ─────────────────── */

const RECENT_KEY = 'unimove_csvsv_recent'

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}

function saveRecentSearch(q: string) {
  const prev = getRecentSearches().filter((r) => r !== q)
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 5)))
}

function SearchBar({
  value,
  onChange,
  onSearch,
  onFilter,
  hasActiveFilter,
}: {
  value:           string
  onChange:        (v: string) => void
  onSearch:        (q: string) => void
  onFilter:        () => void
  hasActiveFilter: boolean
}) {
  const [focused,  setFocused]  = useState(false)
  const [recents,  setRecents]  = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  const showRecent = focused && !value && recents.length > 0

  useEffect(() => {
    if (focused) setRecents(getRecentSearches())
  }, [focused])

  useEffect(() => {
    if (!showRecent) return
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showRecent])

  const commit = (q: string) => {
    if (q.trim()) { saveRecentSearch(q.trim()); onSearch(q.trim()) }
    setFocused(false)
    inputRef.current?.blur()
  }

  return (
    <div className="flex gap-2 px-4 py-3">
      <div ref={wrapRef} className="relative flex-1">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          placeholder="Tìm đồ dùng sinh viên..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(value) }}
          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1E40AF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E40AF]/20 transition-all"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); onSearch('') }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}

        {/* Recent searches */}
        {showRecent && (
          <div className="absolute top-12 left-0 right-0 z-50 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tìm kiếm gần đây</p>
            </div>
            {recents.map((r) => (
              <button
                key={r}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(r); commit(r) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
              >
                <Clock size={13} className="text-gray-300 shrink-0" />
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter button with label */}
      <button
        type="button"
        onClick={onFilter}
        className={cn(
          'flex h-11 items-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition-colors shrink-0',
          hasActiveFilter
            ? 'border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF]'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
        )}
      >
        <SlidersHorizontal size={14} strokeWidth={1.75} />
        Bộ lọc
      </button>
    </div>
  )
}

/* ── Category bar ───────────────────────────────────────────── */

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ListingCategory[]

const CATEGORY_LUCIDE_ICONS: Record<ListingCategory, React.ElementType> = {
  'noi-that':      Armchair,
  'dien-tu':       Smartphone,
  'sach-tai-lieu': BookOpen,
  'quan-ao':       Shirt,
  'do-bep':        ChefHat,
  'khac':          Package,
}

const CHIP_ACTIVE   = { backgroundColor: '#1E3A8A', color: '#FFFFFF' }
const CHIP_INACTIVE = { backgroundColor: '#F3F4F6', color: '#374151' }

function CategoryBar({
  selected,
  onChange,
}: {
  selected: ListingCategory | null
  onChange: (c: ListingCategory | null) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
      {/* "Tất cả" chip */}
      <button
        onClick={() => onChange(null)}
        className="shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.96]"
        style={selected === null ? CHIP_ACTIVE : CHIP_INACTIVE}
      >
        Tất cả
      </button>

      {CATEGORIES.map((cat) => {
        const Icon     = CATEGORY_LUCIDE_ICONS[cat]
        const isActive = selected === cat
        return (
          <button
            key={cat}
            onClick={() => onChange(isActive ? null : cat)}
            className="shrink-0 flex items-center rounded-lg text-xs font-semibold transition-all active:scale-[0.96]"
            style={{
              ...(isActive ? CHIP_ACTIVE : CHIP_INACTIVE),
              gap: 6,
              padding: '8px 14px',
            }}
          >
            <Icon size={13} strokeWidth={2} aria-hidden />
            {CATEGORY_LABELS[cat]}
          </button>
        )
      })}
    </div>
  )
}

/* ── Featured strip ─────────────────────────────────────────── */

function FeaturedSection({ listings }: { listings: ProductCardData[] }) {
  if (!listings.length) return null
  return (
    <section className="mb-3">
      <div className="flex items-center gap-1.5 px-4 pb-2.5">
        <Flame size={14} className="text-orange-500" />
        <h2 className="text-[13px] font-bold text-gray-900">Đang hot</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
        {listings.map((l) => (
          <div key={l.id} className="w-[156px] shrink-0">
            <ProductCard data={l} variant="grid" href={`/cho-sinh-vien/${l.id}`} />
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Main page ──────────────────────────────────────────────── */

export default function KhamPhaPage() {
  const searchQuery      = useMarketplaceStore((s) => s.searchQuery)
  const selectedCategory = useMarketplaceStore((s) => s.selectedCategory)
  const sortBy           = useMarketplaceStore((s) => s.sortBy)
  const setSearch        = useMarketplaceStore((s) => s.setSearch)
  const setCategory      = useMarketplaceStore((s) => s.setCategory)
  const setSort          = useMarketplaceStore((s) => s.setSort)

  const [state,    setState]    = useState<AsyncState<ProductCardData[]>>({ status: 'loading' })
  const [featured, setFeatured] = useState<ProductCardData[]>([])

  const hasActiveFilter = selectedCategory !== null

  const load = useCallback(async (query: string, category: ListingCategory | null) => {
    setState({ status: 'loading' })
    try {
      const res = await marketplaceApi.list({
        search:   query || undefined,
        category: category || undefined,
      })
      if (res.success) {
        const raw: ApiListing[] = Array.isArray(res.data)
          ? (res.data as ApiListing[])
          : ((res.data as { listings?: ApiListing[] })?.listings ?? [])
        const listings = raw.map(toListing)
        setState({ status: 'success', data: listings })
        if (!query && !category) {
          setFeatured(listings.filter((l) => l.isUrgent).slice(0, 6))
        } else {
          setFeatured([])
        }
      } else {
        setState({ status: 'error', error: 'Không tải được danh sách sản phẩm.' })
      }
    } catch {
      setState({ status: 'error', error: 'Lỗi kết nối. Vui lòng thử lại.' })
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => load(searchQuery, selectedCategory), 350)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedCategory, load])

  // Client-side sort
  const sorted: ProductCardData[] = state.status === 'success'
    ? [...state.data].sort((a, b) => {
        if (sortBy === 'gia-tang') return a.price - b.price
        if (sortBy === 'gia-giam') return b.price - a.price
        return 0
      })
    : []

  return (
    <div className="min-h-full" style={{ backgroundColor: '#FAFAFA' }}>
      <SearchBar
        value={searchQuery}
        onChange={setSearch}
        onSearch={(q) => setSearch(q)}
        onFilter={() => { /* TODO: bottom sheet */ }}
        hasActiveFilter={hasActiveFilter}
      />

      <CategoryBar selected={selectedCategory} onChange={setCategory} />

      {state.status === 'loading' && (
        <div className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-3 xl:grid-cols-4 pb-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {state.status === 'error' && (
        <ErrorState
          type="network"
          message={state.error as string}
          onRetry={() => load(searchQuery, selectedCategory)}
          className="mt-8"
        />
      )}

      {state.status === 'success' && sorted.length === 0 && (
        <div className="mx-4 py-14 text-center bg-white rounded-xl border border-gray-100">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-bold text-gray-900 mb-1">Không tìm thấy sản phẩm</p>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            {searchQuery
              ? `Không có kết quả cho "${searchQuery}"`
              : 'Thử chọn danh mục khác hoặc đăng tin đầu tiên!'}
          </p>
          <a href="/cho-sinh-vien/dang-tin">
            <button
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-gray-900"
              style={{ backgroundColor: ACCENT }}
            >
              Đăng tin bán đồ
            </button>
          </a>
        </div>
      )}

      {state.status === 'success' && sorted.length > 0 && (
        <div className="pb-4">
          <FeaturedSection listings={featured} />

          <section>
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              <div>
                <h2 className="text-[13px] font-bold text-gray-900">
                  {searchQuery || selectedCategory ? 'Kết quả tìm kiếm' : 'Tất cả sản phẩm'}
                </h2>
                <p className="text-[11px] text-gray-400">{sorted.length} sản phẩm</p>
              </div>
              <SortDropdown value={sortBy} onChange={setSort} />
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-3 xl:grid-cols-4">
              {sorted.map((l) => (
                <ProductCard key={l.id} data={l} variant="grid" href={`/cho-sinh-vien/${l.id}`} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}