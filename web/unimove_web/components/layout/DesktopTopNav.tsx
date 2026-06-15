'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, User, LogOut, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStoredUser, clearAuth, type AuthUser } from '@/lib/auth'
import { useNotificationStore } from '@/lib/stores'

const NAV_LINKS = [
  { href: '/trang-chu',     label: 'Trang chủ',    exact: false },
  { href: '/cho-sinh-vien', label: 'Chợ sinh viên', exact: false },
  { href: '/dat-chuyen',    label: 'Đặt chuyến',    exact: false },
  { href: '/don-hang',      label: 'Đơn hàng',      exact: false },
] as const

export function DesktopTopNav() {
  const pathname    = usePathname()
  const router      = useRouter()
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  const [user, setUser]           = useState<AuthUser | null>(null)
  const [open, setOpen]           = useState(false)
  const [pos, setPos]             = useState({ top: 0, right: 0 })
  const avatarRef                 = useRef<HTMLButtonElement>(null)
  const dropdownRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUser(getStoredUser())
  }, [pathname])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (
        avatarRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  const toggleDropdown = useCallback(() => {
    if (!open && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect()
      setPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen((v) => !v)
  }, [open])

  const handleLogout = () => {
    clearAuth()
    setUser(null)
    setOpen(false)
    router.replace('/')
  }

  const initials = user?.full_name?.[0]?.toUpperCase() ?? ''

  return (
    <>
      <header className="sticky top-0 z-topnav hidden border-b border-gray-100 bg-white shadow-sm lg:block">
        <div className="mx-auto flex h-[var(--height-topnav)] max-w-[var(--width-container)] items-center gap-8 px-8">

          {/* Logo */}
          <Link href={user ? '/trang-chu' : '/'} className="flex shrink-0 items-center gap-0.5 no-underline" aria-label="UniMove">
            <span className="bg-[#FFCC00] text-white rounded-lg px-2 py-0.5 text-base font-extrabold leading-none">Uni</span>
            <span className="text-base font-extrabold" style={{ color: '#2563EB' }}>Move</span>
          </Link>

          {/* Nav links */}
          {user && (
            <nav aria-label="Điều hướng chính" className="flex items-center gap-1">
              {NAV_LINKS.map(({ href, label, exact }) => {
                const isActive = exact ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-[#2563EB] font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>
          )}

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/thong-bao"
                  aria-label={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Thông báo'}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
                >
                  <Bell className="h-5 w-5 text-gray-600" strokeWidth={1.75} />
                  {unreadCount > 0 && (
                    <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </Link>

                <button
                  ref={avatarRef}
                  onClick={toggleDropdown}
                  className={cn(
                    'flex h-9 w-9 overflow-hidden rounded-full border-2 transition-colors focus:outline-none',
                    open ? 'border-[#2563EB]' : 'border-gray-200 hover:border-[#2563EB]'
                  )}
                  aria-label="Menu tài khoản"
                  aria-expanded={open}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blue-50 text-sm font-bold text-[#2563EB]">
                      {initials || <User className="h-4 w-4" />}
                    </div>
                  )}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm font-semibold text-[#2563EB] hover:underline">
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[#2563EB] px-4 py-1.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.30)] transition-all hover:brightness-110 hover:scale-[1.02]"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dropdown — rendered at body level via fixed positioning, escapes all stacking contexts */}
      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            width: 224,
            zIndex: 99999,
          }}
          className="rounded-2xl bg-white border border-gray-100 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.14)]"
        >
          <div className="px-4 py-2.5 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          <Link
            href="/tai-khoan"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
          >
            <Settings size={15} className="text-gray-400" />
            Tài khoản
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} className="text-red-400" />
            Đăng xuất
          </button>
        </div>
      )}
    </>
  )
}