"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, LogOut, User,
  Home, ClipboardList, ShoppingBag, CreditCard, LayoutDashboard,
  DollarSign, MessageSquare, FileText, Menu, X, CalendarDays,
} from "lucide-react";
import { getStoredUser, logoutToHome, storeAuth, type AuthUser } from "@/lib/auth";
import { notificationsApi, customerApi, authApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { UserMenuDropdown } from "@/components/layout/user-menu-dropdown";
import { ActiveOrderBanner } from "@/components/shared/active-order-banner";

interface NavItem {
  href:   string;
  label:  string;
  icon:   React.ElementType;
}

const customerNav: NavItem[] = [
  { href: "/trang-chu",     label: "Trang chủ",    icon: Home },
  { href: "/don-hang",      label: "Đơn hàng",     icon: ClipboardList },
  { href: "/cho-sinh-vien", label: "Chợ sinh viên", icon: ShoppingBag },
  { href: "/payments",      label: "Thanh toán",   icon: CreditCard },
  { href: "/thong-bao",     label: "Thông báo",    icon: Bell },
];

const providerNav: NavItem[] = [
  { href: "/tai-xe/tong-quan", label: "Tổng quan",  icon: LayoutDashboard },
  { href: "/orders",           label: "Đơn hàng",   icon: ClipboardList },
  { href: "/tai-xe/lich",      label: "Lịch",       icon: CalendarDays },
  { href: "/tai-xe/tin-nhan",  label: "Tin nhắn",   icon: MessageSquare },
  { href: "/tai-xe/thu-nhap",  label: "Thu nhập",   icon: DollarSign },
  { href: "/tai-xe/thong-bao", label: "Thông báo",  icon: Bell },
];

const BRAND = "#1A56DB";  // provider primary (royal blue)
const BLUE  = "#2563EB";  // customer primary

export function WebLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [unread,  setUnread]  = useState(0);
  const [sidebar, setSidebar] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);

    notificationsApi.unreadCount().then(r => {
      if (r.success && r.data) setUnread((r.data as { count?: number }).count ?? 0);
    }).catch(() => {});

    if (u?.role === "customer") {
      customerApi.getMe().then(r => {
        if (r.success && r.data) {
          const profile = { ...u, ...(r.data as AuthUser) };
          setUser(profile);
          const token = localStorage.getItem("unimove_token");
          if (token) storeAuth(profile, token);
        }
      }).catch(() => {});
    } else if (u?.role === "provider") {
      // Always fetch fresh data — localStorage may have stale is_verified after admin approval
      authApi.getMe().then(r => {
        if (r.success && r.data) {
          const fresh = { ...u, ...(r.data as AuthUser) };
          const token = localStorage.getItem("unimove_token");
          if (token) storeAuth(fresh, token);
          setUser(fresh);
          if (!fresh.is_verified) {
            // Chỉ redirect /cho-duyet nếu đã nộp giấy tờ (verification_status = 'pending')
            // Nếu chưa nộp → về form đăng ký tiếp
            const hasSubmitted = fresh.verification_status === 'pending' || fresh.verification_status === 'rejected';
            router.replace(hasSubmitted ? "/cho-duyet" : "/dang-ky-tai-xe");
          }
        } else {
          if (!u?.is_verified) {
            const hasSubmitted = u?.verification_status === 'pending' || u?.verification_status === 'rejected';
            router.replace(hasSubmitted ? "/cho-duyet" : "/dang-ky-tai-xe");
          }
        }
      }).catch(() => {
        if (!u?.is_verified) {
          const hasSubmitted = u?.verification_status === 'pending' || u?.verification_status === 'rejected';
          router.replace(hasSubmitted ? "/cho-duyet" : "/dang-ky-tai-xe");
        }
      });
    }
  }, [pathname]); // re-run on every route change

  const logout     = () => logoutToHome(router);
  const isProvider = user?.role === "provider";
  const nav        = isProvider ? providerNav : customerNav;
  const accent     = isProvider ? BRAND : BLUE;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-0.5 text-[15px] font-extrabold leading-none">
          <span className="bg-[#FFCC00] text-white rounded-lg px-2 py-0.5">Uni</span>
          <span style={{ color: BLUE }}>Move</span>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
          style={{ backgroundColor: isProvider ? BRAND : BLUE }}
        >
          {isProvider ? "Tài xế" : "Khách hàng"}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/orders" && pathname.startsWith(href + "/"));
          return (
            <Link key={href} href={href} onClick={() => setSidebar(false)}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={active
                  ? { backgroundColor: accent, color: "#FFFFFF" }
                  : { color: "#64748B" }
                }
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                <span className="flex-1">{label}</span>
                {href === "/tai-xe/thong-bao" && unread > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold bg-red-500">
                    {unread}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-0.5 shrink-0">
        <Link
          href={isProvider ? "/profile" : "/tai-khoan"}
          onClick={() => setSidebar(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <User size={18} strokeWidth={1.8} />
          <span>Hồ sơ</span>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} strokeWidth={1.8} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col shrink-0 border-r border-gray-100 bg-white"
        style={{ width: "var(--sidebar-width)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebar && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebar(false)} />
          <aside className="relative w-64 h-full bg-white shadow-2xl">
            <button
              onClick={() => setSidebar(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header */}
        <header className="sticky top-0 z-[200] flex items-center justify-between px-6 h-14 bg-white border-b border-gray-100 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebar(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <PageTitle pathname={pathname} nav={nav} />
          </div>

          <div className="flex items-center gap-1.5">
            <Link href={isProvider ? "/tai-xe/thong-bao" : "/thong-bao"}>
              <button className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                <Bell size={17} />
                {unread > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-white text-[9px] font-bold rounded-full bg-red-500"
                    style={{ width: 16, height: 16 }}
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            </Link>
            <UserMenuDropdown
              user={user}
              accentGradient={
                isProvider
                  ? "linear-gradient(135deg, #1648C0, #1A56DB)"
                  : "linear-gradient(135deg, #1e40af, #2563eb)"
              }
            />
          </div>
        </header>

        {/* Content */}
        <main className="relative z-0 flex-1 overflow-y-auto p-6">
          {children}
        </main>
        <ActiveOrderBanner />
      </div>
    </div>
  );
}

function PageTitle({ pathname, nav }: { pathname: string; nav: NavItem[] }) {
  const current = nav.find(n => pathname === n.href || pathname.startsWith(n.href + "/"));
  if (!current) return <span className="text-base font-semibold text-gray-900">UniMove</span>;
  const Icon = current.icon;
  return (
    <div className="flex items-center gap-2">
      <Icon size={17} className="text-gray-400" />
      <span className="text-base font-semibold text-gray-900">{current.label}</span>
    </div>
  );
}