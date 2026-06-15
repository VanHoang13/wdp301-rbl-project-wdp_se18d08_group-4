'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, Package, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/lib/stores'

const NAV_ITEMS = [
  { href: '/trang-chu',     label: 'Trang chủ',  Icon: Home,          exact: false },
  { href: '/cho-sinh-vien', label: 'Chợ SV',     Icon: ShoppingBag,   exact: false },
  { href: '/don-hang',      label: 'Đơn hàng',   Icon: Package,       exact: false },
  { href: '/tin-nhan',      label: 'Tin nhắn',   Icon: MessageCircle, exact: false },
  { href: '/tai-khoan',     label: 'Tài khoản',  Icon: User,          exact: false },
] as const

export function MobileBottomNav() {
  const pathname     = usePathname()
  const unreadCount  = useNotificationStore((s) => s.unreadCount)

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-0 right-0 z-bottomnav lg:hidden bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{
        backdropFilter:       'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        paddingBottom:        'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="flex h-16 items-stretch">
        {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
          const isActive   = exact ? pathname === href : pathname.startsWith(href)
          const showBadge  = href === '/tin-nhan' && unreadCount > 0

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex h-full flex-col items-center justify-center gap-0.5 transition-colors',
                  isActive ? 'text-[#2563EB]' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                {/* Icon + unread badge */}
                <span className="relative">
                  <Icon
                    className={cn('h-[22px] w-[22px] transition-all duration-150', isActive && 'scale-110')}
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                  {showBadge && (
                    <span
                      aria-label={`${unreadCount} tin nhắn chưa đọc`}
                      className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>

                {/* Label */}
                <span className={cn('text-[10px] transition-all', isActive ? 'font-semibold' : 'font-normal')}>
                  {label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 h-0.5 w-10 rounded-t-full bg-[#2563EB]"
                  />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}