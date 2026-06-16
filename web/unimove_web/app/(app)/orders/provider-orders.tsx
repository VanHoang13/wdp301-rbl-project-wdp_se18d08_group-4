"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw, Search, MapPin, Package, Clock,
} from "lucide-react";
import { ordersApi } from "@/lib/api";
import { timeAgo, formatVND } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface Order {
  id: string; status: string;
  pickup_address: string; dropoff_address: string;
  estimated_price?: number; final_price?: number;
  created_at: string;
  customer?: { full_name: string; phone: string };
}

const BRAND   = "#1A56DB";
const SUCCESS = "#16A34A";

const TABS = [
  { key: "",                            label: "Tất cả" },
  { key: "pending",                     label: "Chờ xác nhận" },
  { key: "accepted,picking_up,in_progress", label: "Đang thực hiện" },
  { key: "completed",                   label: "Hoàn thành" },
  { key: "cancelled",                   label: "Đã hủy" },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:     { label: "Chờ xác nhận",    bg: "#FEF9C3", text: "#A16207", dot: "#EAB308" },
  accepted:    { label: "Đã chấp nhận",    bg: "#DBEAFE", text: "#1D4ED8", dot: "#3B82F6" },
  picking_up:  { label: "Đang đến",        bg: "#EDE9FE", text: "#6D28D9", dot: "#8B5CF6" },
  in_progress: { label: "Đang vận chuyển", bg: "#DBEAFE", text: "#1D4ED8", dot: "#3B82F6" },
  completed:   { label: "Hoàn thành",      bg: "#DCFCE7", text: "#15803D", dot: "#16A34A" },
  cancelled:   { label: "Đã hủy",          bg: "#FEE2E2", text: "#DC2626", dot: "#EF4444" },
  disputed:    { label: "Khiếu nại",       bg: "#FEE2E2", text: "#DC2626", dot: "#EF4444" },
  matched:     { label: "Đã ghép đơn",     bg: "#F0FDF4", text: "#15803D", dot: "#16A34A" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

export default function ProviderOrdersPage() {
  const { toast } = useToast();
  const [tab,     setTab]     = useState(0);
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

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
    o.dropoff_address?.toLowerCase().includes(search.toLowerCase()) ||
    o.pickup_address?.toLowerCase().includes(search.toLowerCase()) ||
    (o.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const pendingCount = orders.filter(o => o.status === "pending").length;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-0.5">Nhận và xử lý đơn hàng từ khách</p>
        </div>
        {pendingCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: "#EAB308" }}>
            <Clock size={14} />
            {pendingCount} chờ xác nhận
          </span>
        )}
      </div>

      {/* Tabs + Search bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-2xl bg-gray-100">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className="px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all"
              style={tab === i
                ? { backgroundColor: BRAND, color: "#fff", boxShadow: "0 2px 8px rgba(26,86,219,0.3)" }
                : { backgroundColor: "transparent", color: "#6B7280" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm ml-auto">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Tìm theo địa chỉ, khách hàng..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A56DB] focus:border-[#1A56DB]"
            />
          </div>
          <button onClick={() => load(TABS[tab].key)}
            className="h-10 w-10 rounded-xl flex items-center justify-center border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors shrink-0">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4 items-center animate-pulse">
                <div className="h-4 w-24 rounded bg-gray-100" />
                <div className="h-4 flex-1 rounded bg-gray-100" />
                <div className="h-4 w-20 rounded bg-gray-100" />
                <div className="h-4 w-16 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gray-50">
              <Package size={28} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-500">Không có đơn hàng</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? "Không tìm thấy kết quả phù hợp" : "Chưa có đơn hàng nào"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Mã đơn", "Địa điểm", "Khách hàng", "Giá", "Trạng thái", "Thời gian", "Hành động"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(o => {
                  const isPending = o.status === "pending";
                  const price = o.final_price ?? o.estimated_price;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">

                      {/* Mã đơn */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: "#EAB308" }} />
                          )}
                          <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">
                            #{o.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </td>

                      {/* Địa điểm */}
                      <td className="px-5 py-4">
                        <div className="space-y-1 max-w-[220px]">
                          <div className="flex items-start gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1" />
                            <p className="text-sm text-gray-600 truncate">{o.pickup_address || "—"}</p>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <MapPin size={9} className="shrink-0 mt-0.5 text-blue-400" />
                            <p className="text-sm font-semibold text-gray-800 truncate">{o.dropoff_address || "—"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Khách hàng */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {o.customer ? (
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{o.customer.full_name}</p>
                            <p className="text-xs text-gray-400">{o.customer.phone}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </td>

                      {/* Giá */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {price ? (
                          <span className="text-sm font-bold" style={{ color: SUCCESS }}>
                            {formatVND(price)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={o.status} />
                      </td>

                      {/* Thời gian */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-400">{timeAgo(o.created_at)}</span>
                      </td>

                      {/* Hành động */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <Link href={`/orders/${o.id}`}>
                          <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                            Xem chi tiết
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Hiển thị <strong className="text-gray-600">{filtered.length}</strong> đơn hàng</p>
            {search && (
              <button onClick={() => setSearch("")} className="text-xs text-blue-500 hover:underline">
                Xoá bộ lọc
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
