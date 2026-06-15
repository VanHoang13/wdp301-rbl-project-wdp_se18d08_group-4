'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, ShoppingBag } from 'lucide-react'

const TABS = [
  { label: 'Khám phá',    href: '/cho-sinh-vien' },
  { label: 'Yêu thích',   href: '/cho-sinh-vien/yeu-thich' },
  { label: 'Tin của tôi', href: '/cho-sinh-vien/tin-cua-toi' },
]

const PRIMARY = '#1E40AF'

export default function ChoSinhVienLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        {/* Title + CTA */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)' }}
            >
              <ShoppingBag size={17} className="text-white" />
            </div>
            <div>
              <h1 className="text-[17px] font-extrabold text-gray-900 leading-tight">Chợ sinh viên</h1>
              <p className="text-[11px] text-gray-500 leading-none mt-0.5">Mua bán đồ dùng sinh viên</p>
            </div>
          </div>

          <Link
            href="/cho-sinh-vien/dang-tin"
            aria-label="Đăng tin bán đồ"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[13px] text-gray-900 shadow-sm transition-all hover:brightness-95 active:scale-[0.97]"
            style={{ backgroundColor: '#FACC15' }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Đăng tin
          </Link>
        </div>

        {/* Tab bar — pill style */}
        <nav className="flex gap-1.5 px-4 pb-3" role="tablist" aria-label="Điều hướng chợ sinh viên">
          {TABS.map(({ label, href }) => {
            const isActive = href === '/cho-sinh-vien'
              ? pathname === href
              : pathname.startsWith(href)

            return (
              <Link
                key={href}
                href={href}
                role="tab"
                aria-selected={isActive}
                className="flex-1 py-2 text-center text-[13px] font-semibold rounded-lg transition-all"
                style={
                  isActive
                    ? { backgroundColor: PRIMARY, color: '#FFFFFF' }
                    : { backgroundColor: '#F1F5F9', color: '#64748B' }
                }
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Page content */}
      {children}
    </div>
  )
}