'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { ProductCard, type ProductCardData } from '@/components/cards/ProductCard'
import { ErrorState } from '@/components/shared/ErrorState'
import { useMarketplaceStore } from '@/lib/stores/useMarketplaceStore'
import { marketplaceApi } from '@/lib/api'
import type { AsyncState } from '@/lib/types/states'

interface ApiListing {
  id: string; title: string; price?: number; condition?: string; city?: string
  status: string; images?: string[]; is_urgent?: boolean
  created_at?: string; seller?: { full_name?: string }
}

function toListing(l: ApiListing): ProductCardData {
  return {
    id: l.id, title: l.title, price: l.price ?? 0,
    condition: l.condition, location: l.city, imageUrl: l.images?.[0],
    isUrgent: l.is_urgent, created_at: l.created_at, seller_name: l.seller?.full_name,
  }
}

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
      </div>
    </div>
  )
}

export default function YeuThichPage() {
  const savedIds = useMarketplaceStore((s) => s.savedListingIds)
  const [state, setState] = useState<AsyncState<ProductCardData[]>>({ status: 'loading' })

  useEffect(() => {
    async function load() {
      setState({ status: 'loading' })
      try {
        const res = await marketplaceApi.myInterests()
        if (res.success) {
          const raw: ApiListing[] = Array.isArray(res.data)
            ? (res.data as ApiListing[])
            : ((res.data as { listings?: ApiListing[] })?.listings ?? [])
          setState({ status: 'success', data: raw.map(toListing) })
        } else {
          setState({ status: 'error', error: 'Không tải được danh sách yêu thích.' })
        }
      } catch {
        setState({ status: 'error', error: 'Lỗi kết nối.' })
      }
    }
    load()
  }, [savedIds.length])

  return (
    <div className="pb-6 pt-3 min-h-full" style={{ backgroundColor: '#FAFAFA' }}>
      {state.status === 'loading' && (
        <div className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {state.status === 'error' && (
        <ErrorState
          type="network"
          message={state.error as string}
          onRetry={() => setState({ status: 'loading' })}
          className="mt-8"
        />
      )}

      {state.status === 'success' && state.data.length === 0 && (
        <div className="mx-4 mt-4 py-14 text-center bg-white rounded-xl border border-gray-100">
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)' }}
          >
            <Heart size={40} className="text-red-400" />
          </div>
          <p className="text-lg font-extrabold text-gray-900 mb-2">Chưa có sản phẩm yêu thích</p>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
            Nhấn vào biểu tượng ♡ trên sản phẩm để lưu lại những món bạn thích
          </p>
          <Link href="/cho-sinh-vien">
            <button
              className="px-6 py-2.5 rounded-lg font-bold text-sm text-gray-900 shadow-sm transition-all hover:brightness-95 active:scale-[0.97]"
              style={{ backgroundColor: '#FACC15' }}
            >
              Khám phá ngay
            </button>
          </Link>
        </div>
      )}

      {state.status === 'success' && state.data.length > 0 && (
        <>
          <div className="flex items-center justify-between px-4 pb-3">
            <p className="text-[13px] font-bold text-gray-900">Đã lưu</p>
            <span className="text-xs text-gray-400">{state.data.length} sản phẩm</span>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-3 xl:grid-cols-4">
            {state.data.map((l) => (
              <ProductCard key={l.id} data={l} variant="grid" href={`/cho-sinh-vien/${l.id}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}