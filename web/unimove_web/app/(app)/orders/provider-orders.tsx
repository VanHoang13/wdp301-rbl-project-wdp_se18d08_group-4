"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Truck,
  RefreshCw,
  Search,
  Car,
  Headphones,
  FileText,
  Navigation,
  Filter,
  Download,
  MoreVertical,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { formatVND, cn } from "@/lib/utils";
import {
  getProviderOrderStatusLabel,
  isAwaitingDeposit,
  isOpenQuoteRequest,
  isReadyToAccept,
} from "@/lib/provider-order";
import { useToast } from "@/components/ui/toast";

const GREEN = "#1B4332";

interface Order {
  id: string;
  order_number?: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  vehicle_size?: string;
  quote_request?: boolean;
  provider_id?: string | null;
  deposit_paid?: boolean;
  estimated_price?: number;
  final_price?: number;
  total_price?: number;
  created_at: string;
  customer?: { full_name: string; phone: string };
}

const TABS = [
  { key: "", label: "Tất cả", match: () => true },
  { key: "pending", label: "Chờ xác nhận", match: (s: string) => s === "pending" || s === "matched" },
  {
    key: "accepted,picking_up,in_progress",
    label: "Đang thực hiện",
    match: (s: string) => ["accepted", "picking_up", "in_progress"].includes(s),
  },
  { key: "completed", label: "Hoàn thành", match: (s: string) => s === "completed" },
  { key: "cancelled", label: "Đã hủy", match: (s: string) => s === "cancelled" },
];

function vehicleLabel(size?: string) {
  const map: Record<string, string> = {
    small_truck: "Xe bán tải",
    medium_truck: "Tải 1.5 Tấn",
    large_truck: "Tải 5 Tấn",
    van: "Xe van",
    motorbike: "Xe máy",
  };
  return (size && map[size]) || size || "Xe tải";
}

function orderCode(o: Order) {
  if (o.order_number) return o.order_number.replace(/^UNI-/i, "").slice(0, 8).toUpperCase();
  return o.id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function statusBadgeStyle(status: string) {
  if (status === "pending" || status === "matched") {
    return { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" };
  }
  if (status === "completed") {
    return { bg: "#D1FAE5", text: "#047857", border: "#A7F3D0" };
  }
  if (["accepted", "picking_up", "in_progress"].includes(status)) {
    return { bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" };
  }
  if (status === "cancelled") {
    return { bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA" };
  }
  return { bg: "#F3F4F6", text: "#4B5563", border: "#E5E7EB" };
}

function dotColor(status: string) {
  if (status === "pending" || status === "matched") return "#F59E0B";
  if (status === "completed") return "#10B981";
  if (["accepted", "picking_up", "in_progress"].includes(status)) return "#3B82F6";
  return "#9CA3AF";
}

function exportCsv(orders: Order[]) {
  const header = ["Mã đơn", "Trạng thái", "Điểm đi", "Điểm đến", "Giá", "Ngày tạo"];
  const rows = orders.map((o) => [
    o.order_number ?? o.id,
    getProviderOrderStatusLabel(o, getStoredUser()?.id),
    o.pickup_address,
    o.dropoff_address,
    String(o.final_price ?? o.estimated_price ?? o.total_price ?? ""),
    o.created_at,
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `don-hang-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProviderOrdersPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await ordersApi.list({});
      if (r.success && r.data) {
        const d = r.data as Order[];
        setOrders(Array.isArray(d) ? d : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => TABS.map((t) => orders.filter((o) => t.match(o.status)).length),
    [orders],
  );

  const tabOrders = useMemo(
    () => orders.filter((o) => TABS[tab].match(o.status)),
    [orders, tab],
  );

  const filtered = tabOrders.filter(
    (o) =>
      !search ||
      (o.dropoff_address?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (o.pickup_address?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (o.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      orderCode(o).toLowerCase().includes(search.toLowerCase()),
  );

  const handle = async (id: string, action: "accept" | "reject") => {
    try {
      await ordersApi.respond(id, action);
      toast(action === "accept" ? "Đã chấp nhận!" : "Đã từ chối", action === "accept" ? "success" : "info");
      load();
    } catch {
      toast("Thử lại sau", "error");
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: GREEN }}>
            Quản lý đơn hàng
          </h1>
          <p className="text-sm mt-1 text-gray-500">Nhận và xử lý đơn hàng từ khách</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowFilter((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter size={16} />
            Bộ lọc nâng cao
          </button>
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <Download size={16} />
            Xuất báo cáo
          </button>
          <button
            type="button"
            onClick={load}
            className="h-10 w-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50"
            aria-label="Làm mới"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(i)}
            className={cn(
              "whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-semibold transition-all shrink-0 border",
              tab === i
                ? "text-white border-transparent shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300",
            )}
            style={tab === i ? { backgroundColor: GREEN } : undefined}
          >
            {t.label} ({counts[i]})
          </button>
        ))}
      </div>

      {/* Advanced filter */}
      {showFilter && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Tìm mã đơn, địa chỉ, tên khách..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]/40"
            />
          </div>
        </div>
      )}

      {/* Order cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm">
          <Truck size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-700">Không có đơn hàng</p>
          <p className="text-sm text-gray-400 mt-1">Thử đổi bộ lọc hoặc làm mới danh sách</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              providerId={getStoredUser()?.id}
              onAccept={() => handle(o.id, "accept")}
              onReject={() => handle(o.id, "reject")}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 && !loading && (
        <p className="text-xs text-gray-400 text-center">Hiển thị {filtered.length} đơn hàng</p>
      )}
    </div>
  );
}

function OrderCard({
  order,
  providerId,
  onAccept,
  onReject,
}: {
  order: Order;
  providerId?: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const openQuote = isOpenQuoteRequest(order);
  const awaitingDeposit = isAwaitingDeposit(order, providerId);
  const readyToAccept = isReadyToAccept(order, providerId);
  const isPendingNonQuote = order.status === "pending" && !order.quote_request;
  const isActive = ["accepted", "picking_up", "in_progress"].includes(order.status);
  const isCompleted = order.status === "completed";
  const badge = statusBadgeStyle(
    readyToAccept ? "accepted" : awaitingDeposit ? "pending" : order.status,
  );
  const price = order.final_price ?? order.estimated_price ?? order.total_price;
  const statusLabel = getProviderOrderStatusLabel(order, providerId);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-5 grid grid-cols-1 lg:grid-cols-[minmax(140px,1fr)_2fr_minmax(200px,1fr)] gap-5 items-start">
        {/* Left — mã đơn + loại xe */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor(order.status) }} />
            <span className="font-mono font-bold text-sm text-gray-900">#{orderCode(order)}</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Loại xe</p>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              {order.vehicle_size?.includes("motorbike") ? (
                <Car size={18} className="text-gray-500" />
              ) : (
                <Truck size={18} className="text-gray-500" />
              )}
              {vehicleLabel(order.vehicle_size)}
            </div>
          </div>
        </div>

        {/* Middle — lộ trình */}
        <div className="relative pl-1">
          <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gray-200" />
          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm shrink-0 mt-0.5 z-10" style={{ backgroundColor: GREEN }} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Điểm bốc hàng</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5 leading-snug">{order.pickup_address}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm shrink-0 mt-0.5 z-10 bg-red-500" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Điểm trả hàng</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5 leading-snug">{order.dropoff_address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — giá + trạng thái + hành động */}
        <div className="flex flex-col items-start lg:items-end gap-3 lg:border-l lg:border-gray-50 lg:pl-5">
          <div className="w-full lg:text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tổng giá trị</p>
            <p className="text-xl font-extrabold text-gray-900 mt-0.5">
              {price ? formatVND(price) : "—"}
            </p>
          </div>

          <span
            className="text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full border"
            style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border }}
          >
            {statusLabel}
          </span>

          <div className="flex flex-wrap items-center gap-2 w-full lg:justify-end mt-1">
            {isPendingNonQuote && (
              <>
                <button
                  type="button"
                  onClick={onReject}
                  className="text-sm font-semibold text-gray-500 hover:text-red-600 px-2 py-1.5"
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: GREEN }}
                >
                  Nhận đơn
                </button>
              </>
            )}

            {openQuote && (
              <Link href={`/orders/${order.id}`}>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm"
                  style={{ backgroundColor: GREEN }}
                >
                  Gửi báo giá
                </button>
              </Link>
            )}

            {awaitingDeposit && (
              <span className="px-3 py-2 rounded-xl text-sm font-semibold bg-amber-50 text-amber-800 border border-amber-100">
                Chờ khách đặt cọc
              </span>
            )}

            {readyToAccept && (
              <button
                type="button"
                onClick={onAccept}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: GREEN }}
              >
                Nhận đơn
              </button>
            )}

            {isCompleted && (
              <>
                <Link href={`/orders/${order.id}`}>
                  <button type="button" className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-2 py-1.5">
                    Chi tiết
                  </button>
                </Link>
                <Link href={`/orders/${order.id}`}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <FileText size={14} />
                    Tải hóa đơn
                  </button>
                </Link>
              </>
            )}

            {isActive && (
              <>
                <Link href={`/orders/${order.id}`}>
                  <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 px-2 py-1.5">
                    <Navigation size={14} />
                    Theo dõi
                  </button>
                </Link>
                <Link href={`/orders/${order.id}`}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ backgroundColor: "#3B82F6" }}
                  >
                    <Headphones size={14} />
                    Hỗ trợ
                  </button>
                </Link>
              </>
            )}

            {!openQuote && !isPendingNonQuote && !readyToAccept && !awaitingDeposit && !isCompleted && !isActive && (
              <Link href={`/orders/${order.id}`}>
                <button type="button" className="text-sm font-semibold text-gray-600 px-2 py-1.5">
                  Chi tiết
                </button>
              </Link>
            )}

            <Link href={`/orders/${order.id}`} className="p-2 rounded-lg hover:bg-gray-50 text-gray-400">
              <MoreVertical size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
