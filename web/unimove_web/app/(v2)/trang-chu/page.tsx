"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck, Package, ShoppingBag, Shield,
  ChevronRight, MapPin, Clock, Star, TrendingUp, Zap, Plus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { customerApi, ordersApi } from "@/lib/api";
import { getStoredUser, type AuthUser } from "@/lib/auth";
import { formatVND, getOrderStatusLabel, getOrderStatusColor, timeAgo } from "@/lib/utils";

interface Order {
  id: string; status: string;
  pickup_address: string; dropoff_address: string;
  estimated_price?: number; final_price?: number; created_at: string;
  provider?: { full_name: string; rating: number };
}

function StatCard({ label, value, icon, iconColor, iconBg }: {
  label: string; value: string;
  icon: React.ReactNode; iconColor: string; iconBg: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: iconBg, color: iconColor }}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs mt-1 text-gray-500">{label}</p>
    </div>
  );
}

export default function TrangChuPage() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, ordersRes] = await Promise.allSettled([
          customerApi.getMe(),
          ordersApi.list({ page: 1 }),
        ]);
        if (profileRes.status === "fulfilled" && profileRes.value.success)
          setUser(profileRes.value.data as AuthUser);
        if (ordersRes.status === "fulfilled" && ordersRes.value.success) {
          const d = ordersRes.value.data as { orders?: Order[] } | Order[];
          setOrders((Array.isArray(d) ? d : (d?.orders ?? [])).slice(0, 5));
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const activeOrders = orders.filter(o => !["completed", "cancelled"].includes(o.status));

  const services = [
    { label: "Chuyển trọ",    desc: "Báo giá minh bạch",  href: "/dat-chuyen",               icon: Truck,       iconColor: "#2563EB", iconBg: "#EFF6FF" },
    { label: "Khuân vác",     desc: "Theo giờ linh hoạt", href: "/dat-chuyen?loai=khuan-vac", icon: Package,     iconColor: "#16a34a", iconBg: "#dcfce7" },
    { label: "Chợ sinh viên", desc: "Mua bán đồ cũ",      href: "/cho-sinh-vien",             icon: ShoppingBag, iconColor: "#d97706", iconBg: "#fef3c7" },
    { label: "Bảng phụ phí",  desc: "Giá tham khảo",      href: "/reference-prices",          icon: Shield,      iconColor: "#9333ea", iconBg: "#f3e8ff" },
  ];

  return (
    <div className="space-y-5 px-4 pb-6 pt-4 max-w-2xl mx-auto lg:max-w-4xl">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563EB 55%, #3b82f6 100%)", minHeight: "140px" }}>
        <div className="px-6 py-6 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFCC00]" />
            <span className="text-white/90 text-xs font-medium">{greeting}</span>
          </div>
          {loading
            ? <div className="h-7 w-44 rounded-lg mb-1 bg-white/20 animate-pulse" />
            : <h1 className="text-xl font-bold text-white mb-1">{user?.full_name ?? "Bạn"}</h1>
          }
          <p className="text-blue-100 text-sm mb-4">Bạn cần chuyển trọ hôm nay?</p>
          <Link href="/dat-chuyen"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFCC00] text-gray-900 text-sm font-bold shadow-lg hover:bg-[#E6B800] transition-colors no-underline">
            <Zap size={15} /> Đặt dịch vụ ngay
          </Link>
        </div>
        <Truck className="absolute -right-4 top-1/2 -translate-y-1/2 text-white opacity-10" size={130} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Đơn đang thực hiện"
          value={activeOrders.length.toString()}
          icon={<Truck size={20} />}
          iconColor="#2563EB"
          iconBg="#EFF6FF"
        />
        <StatCard
          label="Đơn hoàn thành"
          value={orders.filter(o => o.status === "completed").length.toString()}
          icon={<TrendingUp size={20} />}
          iconColor="#16a34a"
          iconBg="#dcfce7"
        />
        <StatCard
          label="Điểm thưởng"
          value={(user as (AuthUser & { loyalty_points?: number }))?.loyalty_points?.toString() ?? "0"}
          icon={<Star size={20} />}
          iconColor="#d97706"
          iconBg="#fef3c7"
        />
        <StatCard
          label="Chờ báo giá"
          value={orders.filter(o => o.status === "pending").length.toString()}
          icon={<Clock size={20} />}
          iconColor="#d97706"
          iconBg="#fef3c7"
        />
      </div>

      {/* Services */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-gray-900">Dịch vụ</h2>
        <div className="grid grid-cols-2 gap-3">
          {services.map(({ label, desc, href, icon: Icon, iconColor, iconBg }) => (
            <Link key={href} href={href} className="no-underline">
              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 active:scale-[0.98] transition-all cursor-pointer">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: iconBg }}>
                  <Icon size={22} style={{ color: iconColor }} />
                </div>
                <p className="text-sm font-bold text-gray-900">{label}</p>
                <p className="text-xs mt-0.5 text-gray-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/reference-prices" className="block mt-3 no-underline">
          <div className="p-4 rounded-2xl flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, #FFCC00, #E6A800)" }}>
            <div>
              <p className="text-gray-900 text-xs font-bold uppercase tracking-wide">Giá tham khảo</p>
              <p className="text-gray-800 text-sm font-medium mt-0.5">Xem bảng phụ phí chi tiết</p>
            </div>
            <ChevronRight size={18} className="text-gray-700 opacity-70" />
          </div>
        </Link>
      </section>

      {/* Recent orders */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Đơn hàng gần đây</h2>
          <Link href="/don-hang" className="text-xs font-semibold flex items-center gap-1 text-[#2563EB] hover:underline no-underline">
            Xem tất cả <ChevronRight size={13} />
          </Link>
        </div>

        <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <Truck size={44} className="mx-auto mb-3 text-gray-300" />
              <p className="font-semibold mb-1 text-sm text-gray-900">Chưa có đơn hàng</p>
              <p className="text-xs mb-4 text-gray-500">Đặt dịch vụ đầu tiên của bạn!</p>
              <Link href="/dat-chuyen" className="no-underline">
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-bold bg-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.30)] hover:brightness-110 transition-all">
                  <Plus size={16} /> Đặt ngay
                </button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.map(order => {
                const sc = getOrderStatusColor(order.status);
                const price = order.final_price ?? order.estimated_price;
                return (
                  <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
                      <MapPin size={14} className="text-[#2563EB]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-gray-900">{order.dropoff_address}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {price && <span className="text-xs font-semibold text-gray-700">{formatVND(price)}</span>}
                        <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge style={{ backgroundColor: sc + "22", color: sc, border: `1px solid ${sc}44`, fontSize: "10px" }}>
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                      <Link href={`/don-hang/${order.id}`}>
                        <span className="text-xs font-medium text-[#2563EB]">Chi tiết</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}