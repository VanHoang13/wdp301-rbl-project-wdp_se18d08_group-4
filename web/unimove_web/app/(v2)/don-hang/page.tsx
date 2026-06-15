"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Truck, Plus, MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi } from "@/lib/api";
import { getOrderStatusLabel, getOrderStatusColor, timeAgo, formatVND } from "@/lib/utils";

interface Order { id: string; status: string; pickup_address: string; dropoff_address: string; estimated_price?: number; final_price?: number; created_at: string; provider?: { full_name: string }; }

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "pending,accepted,picking_up,in_progress", label: "Đang thực hiện" },
  { key: "completed", label: "Hoàn thành" },
  { key: "cancelled", label: "Đã huỷ" },
];

export default function DonHangPage() {
  const [tab, setTab] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const r = await ordersApi.list(status ? { status } : {});
      if (r.success && r.data) {
        const d = r.data as { orders?: Order[] } | Order[];
        setOrders(Array.isArray(d) ? d : (d?.orders ?? []));
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(TABS[tab].key); }, [tab, load]);

  const filtered = orders.filter(o =>
    !search ||
    (o.dropoff_address?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    (o.pickup_address?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-4 px-4 pb-6 pt-5 max-w-2xl mx-auto lg:max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý tất cả đơn chuyển trọ của bạn</p>
        </div>
        <Link href="/dat-chuyen">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-sm font-bold bg-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:brightness-110 active:scale-[0.97] transition-all">
            <Plus size={15} /> Đặt mới
          </button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className="shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{
              backgroundColor: tab === i ? "#2563EB" : "#F1F5F9",
              color: tab === i ? "#FFFFFF" : "#64748B",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Tìm kiếm địa điểm..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Truck size={32} className="text-[#2563EB]" />
          </div>
          <p className="font-bold text-gray-900 mb-1">Không có đơn hàng nào</p>
          <p className="text-sm text-gray-500 mb-5">Đặt chuyến đầu tiên để bắt đầu!</p>
          {tab === 0 && !search && (
            <Link href="/dat-chuyen">
              <button className="px-6 py-2.5 rounded-full text-white text-sm font-bold bg-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:brightness-110 transition-all">
                Đặt dịch vụ ngay
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const sc = getOrderStatusColor(o.status);
            const price = o.final_price ?? o.estimated_price;
            return (
              <div key={o.id} className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
                  <span className="text-xs font-mono font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </span>
                  <Badge style={{ backgroundColor: sc + "18", color: sc, border: `1px solid ${sc}33`, fontSize: "11px", fontWeight: 600, borderRadius: "999px" }}>
                    {getOrderStatusLabel(o.status)}
                  </Badge>
                </div>
                {/* Route */}
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
                    <p className="text-sm text-gray-500 truncate">{o.pickup_address}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin size={11} className="shrink-0 text-green-500" />
                    <p className="text-sm font-semibold text-gray-900 truncate">{o.dropoff_address}</p>
                  </div>
                </div>
                {/* Card footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-50 bg-gray-50/60">
                  <div className="flex items-center gap-2">
                    {price && <span className="text-sm font-bold text-gray-900">{formatVND(price)}</span>}
                    <span className="text-xs text-gray-400">{timeAgo(o.created_at)}</span>
                  </div>
                  <Link href={`/don-hang/${o.id}`}>
                    <button className="text-xs font-bold px-3 py-1.5 rounded-full text-[#2563EB] bg-blue-50 hover:bg-blue-100 transition-colors">
                      Chi tiết →
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
          <p className="text-center text-xs text-gray-400 py-2">{filtered.length} đơn hàng</p>
        </div>
      )}
    </div>
  );
}