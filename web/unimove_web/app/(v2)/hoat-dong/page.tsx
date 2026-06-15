"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Truck, MapPin, ChevronRight, RefreshCw, History, Star, Navigation } from "lucide-react";
import { FadeSlideIn } from "@/components/motion/fade-slide-in";
import { PressableScale } from "@/components/motion/pressable-scale";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi } from "@/lib/api";
import { getOrderStatusLabel, getOrderStatusColor, timeAgo, formatVND } from "@/lib/utils";

interface Order {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_price?: number;
  final_price?: number;
  created_at: string;
  provider_id?: string;
  provider?: { full_name: string };
}

const ACTIVE = ["pending", "accepted", "matched", "picking_up", "in_progress"];

export default function HoatDongPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await ordersApi.list({});
      if (r.success && r.data) {
        const d = r.data as { orders?: Order[] } | Order[];
        setOrders(Array.isArray(d) ? d : (d?.orders ?? []));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeOrder = orders.find((o) => ACTIVE.includes(o.status) && o.provider_id);
  const reviewOrder = orders.find((o) => o.status === "completed");
  const recent = orders.slice(0, 8);

  return (
    <div className="px-5 pt-5 pb-6 max-w-2xl mx-auto lg:max-w-4xl space-y-5">
      <FadeSlideIn>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Hoạt động</h1>
            <p className="text-sm text-gray-500 mt-0.5">Đơn đang chạy & lịch sử gần đây</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2.5 rounded-xl bg-white border border-gray-100 shadow-sm" aria-label="Làm mới">
              <RefreshCw size={18} className="text-gray-500" />
            </button>
            <Link href="/don-hang">
              <PressableScale className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium bg-[#EFF6FF] border border-blue-100 text-gray-800">
                <History size={16} /> Lịch sử
              </PressableScale>
            </Link>
          </div>
        </div>
      </FadeSlideIn>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <>
          {activeOrder && (
            <FadeSlideIn delay={80}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] mb-2">Đang thực hiện</p>
              <Link href={`/don-hang/${activeOrder.id}`} className="no-underline">
                <GlassCard className="p-4 border-2 border-[#2563EB]/40" hover>
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-[#EFF6FF] text-[#2563EB] border-0">
                      {getOrderStatusLabel(activeOrder.status)}
                    </Badge>
                    <Navigation size={18} className="text-[#2563EB]" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                    {activeOrder.pickup_address} → {activeOrder.dropoff_address}
                  </p>
                  {activeOrder.provider && (
                    <p className="text-xs text-gray-500">Nhà xe: {activeOrder.provider.full_name}</p>
                  )}
                  <p className="text-sm font-bold mt-2 text-[#2563EB] flex items-center gap-1">
                    Theo dõi đơn <ChevronRight size={16} />
                  </p>
                </GlassCard>
              </Link>
            </FadeSlideIn>
          )}

          {reviewOrder && (
            <FadeSlideIn delay={120}>
              <Link href={`/don-hang/${reviewOrder.id}`} className="no-underline block">
                <motion.div whileHover={{ scale: 1.01 }} className="rounded-2xl p-4 flex items-center gap-4 bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200">
                  <Star size={28} className="text-amber-600 shrink-0" fill="#d97706" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-900 text-sm">Đánh giá chuyến đi</p>
                    <p className="text-xs text-amber-800/80">Chia sẻ trải nghiệm với nhà xe</p>
                  </div>
                  <ChevronRight className="text-amber-700" size={20} />
                </motion.div>
              </Link>
            </FadeSlideIn>
          )}

          <FadeSlideIn delay={160}>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Gần đây</h2>
            {recent.length === 0 ? (
              <GlassCard className="p-10 text-center">
                <Truck size={36} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Chưa có hoạt động</p>
                <Link href="/dat-chuyen" className="inline-block mt-4 text-sm font-semibold text-[#2563EB] no-underline">
                  Đặt chuyến đầu tiên →
                </Link>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {recent.map((order, i) => (
                  <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link href={`/don-hang/${order.id}`} className="no-underline">
                      <GlassCard className="p-4" hover>
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                            <Truck size={18} className="text-[#2563EB]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">{order.dropoff_address}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin size={10} className="text-gray-400" />
                              <span className="text-xs text-gray-500 line-clamp-1">{order.pickup_address}</span>
                            </div>
                            <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge style={{
                              backgroundColor: getOrderStatusColor(order.status) + "22",
                              color: getOrderStatusColor(order.status),
                              fontSize: "10px",
                            }}>
                              {getOrderStatusLabel(order.status)}
                            </Badge>
                            {(order.final_price ?? order.estimated_price) && (
                              <p className="text-xs font-semibold mt-1 text-gray-700">
                                {formatVND(order.final_price ?? order.estimated_price ?? 0)}
                              </p>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </FadeSlideIn>
        </>
      )}
    </div>
  );
}
