"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Star,
  CheckCircle,
  Truck,
  Clock,
  ChevronRight,
  XCircle,
  CreditCard,
  RefreshCw,
  Bell,
  MessageCircle,
  Navigation,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi, quotesApi, paymentsApi } from "@/lib/api";
import { getOrderStatusLabel, formatVND, formatDate, cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores";
import { getStoredUser } from "@/lib/auth";

const NAVY = "#0F1E3D";
const BLUE = "#2563EB";

interface OrderDetail {
  id: string;
  status: string;
  service_type: string;
  quote_request?: boolean;
  provider_id?: string;
  pickup_address: string;
  dropoff_address: string;
  description?: string;
  estimated_price?: number;
  final_price?: number;
  total_price?: number;
  deposit_amount?: number;
  deposit_paid?: boolean;
  created_at: string;
  provider?: { id: string; full_name: string; phone?: string; rating?: number; vehicle_type?: string };
  provider_name?: string;
  provider_phone?: string;
}

interface Quote {
  id: string;
  provider_id: string;
  total_price: number;
  base_price: number;
  note?: string;
  provider_name?: string;
  provider_avatar_url?: string | null;
  provider_rating?: number;
  provider_review_count?: number;
  status: string;
  schedule_fit?: string;
}

const STEPS = [
  { key: "pending", label: "Chờ báo giá", icon: Clock },
  { key: "matched", label: "Chọn nhà xe", icon: Truck },
  { key: "accepted", label: "Đã xác nhận", icon: CheckCircle },
  { key: "picking_up", label: "Đang đến", icon: Navigation },
  { key: "in_progress", label: "Vận chuyển", icon: Truck },
  { key: "completed", label: "Hoàn thành", icon: CheckCircle },
];

function parseQuotes(data: unknown): Quote[] {
  if (Array.isArray(data)) return data as Quote[];
  if (data && typeof data === "object" && Array.isArray((data as { quotes?: Quote[] }).quotes)) {
    return (data as { quotes: Quote[] }).quotes;
  }
  return [];
}

function orderStepIndex(status: string, hasQuotes: boolean): number {
  if (status === "pending") return hasQuotes ? 1 : 0;
  if (status === "matched") return 1;
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

function stepLabel(step: (typeof STEPS)[number], order: OrderDetail): string {
  if (order.status === "matched" && step.key === "matched") {
    return order.deposit_paid ? "Chờ nhà xe xác nhận" : "Chọn nhà xe";
  }
  if (order.status === "accepted" && step.key === "accepted") {
    return "Đã xác nhận";
  }
  if (
    (order.status === "accepted" || order.status === "picking_up") &&
    step.key === "picking_up"
  ) {
    return "Chờ đến giờ lấy đồ";
  }
  return step.label;
}

function shortPlace(addr: string) {
  const part = addr.split(",")[0]?.trim();
  return part && part.length < addr.length ? part : addr.slice(0, 48);
}

function quoteTags(q: Quote): string {
  const parts: string[] = [];
  if (q.schedule_fit === "exact_match") parts.push("Nhận đúng giờ");
  else if (q.schedule_fit === "alternate_proposed") parts.push("Đề xuất giờ khác");
  if (q.note) parts.push(q.note);
  else parts.push("Bảo hiểm 100%");
  return parts.join(" • ");
}

export default function DonHangDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useUIStore();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    const r = await ordersApi.get(id);
    let o = r.success && r.data ? (r.data as OrderDetail) : null;

    if (o?.status === "matched" && !o.deposit_paid) {
      try {
        const listRes = await paymentsApi.list();
        const rows = Array.isArray(listRes.data)
          ? listRes.data
          : (listRes.data as { payments?: { id?: string; order_id?: string; status?: string }[] })
              ?.payments ?? [];
        for (const p of rows.filter((p) => p.order_id === id)) {
          if (p.id && (p.status === "pending" || p.status === "completed")) {
            await paymentsApi.sync(p.id);
          }
        }
        const r2 = await ordersApi.get(id);
        o = r2.success && r2.data ? (r2.data as OrderDetail) : o;
      } catch {
        /* giữ order hiện tại */
      }
    }

    if (o) setOrder(o);

    if (
      o?.quote_request ||
      o?.status === "pending" ||
      o?.status === "matched" ||
      o?.status === "accepted"
    ) {
      try {
        const q = await quotesApi.list(id);
        setQuotes(parseQuotes(q.data));
      } catch {
        setQuotes([]);
      }
    } else {
      setQuotes([]);
    }
  }, [id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!order) return;
    const awaitingQuotes =
      order.quote_request && order.status === "pending" && !order.provider_id;
    const awaitingProviderAccept = order.status === "matched" && !!order.deposit_paid;
    if (!awaitingQuotes && !awaitingProviderAccept) return;
    const t = setInterval(load, 8_000);
    return () => clearInterval(t);
  }, [order?.quote_request, order?.status, order?.provider_id, order?.deposit_paid, load]);

  const cancelOrder = async () => {
    if (!confirm("Hủy đơn hàng này?")) return;
    setActing(true);
    try {
      await ordersApi.cancel(id, "Khách hủy đơn");
      showSuccess("Đã hủy đơn");
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Không thể hủy");
    } finally {
      setActing(false);
    }
  };

  const selectQuote = async (quoteId: string) => {
    setActing(true);
    try {
      await quotesApi.select(id, quoteId);
      showSuccess("Đã chọn nhà xe — vui lòng đặt cọc");
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Không thể chọn báo giá");
    } finally {
      setActing(false);
    }
  };

  const payDeposit = async () => {
    if (!order) return;
    const amount = order.deposit_amount ?? Math.round((order.total_price ?? order.estimated_price ?? 0) * 0.3);
    if (!amount) {
      showError("Chưa có số tiền cọc");
      return;
    }
    setActing(true);
    try {
      const user = getStoredUser();
      const res = await paymentsApi.createDeposit(order.id, amount, "payos", {
        customer_name: user?.full_name,
        customer_email: user?.email,
      });
      const url = (res.data as { checkout_url?: string })?.checkout_url;
      if (url) window.location.href = url;
      else showError("Không tạo được link thanh toán");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Thanh toán thất bại");
    } finally {
      setActing(false);
    }
  };

  const stepIdx = order ? orderStepIndex(order.status, quotes.length > 0) : -1;
  const activeQuotes = quotes.filter((q) => q.status === "submitted" || q.status === "selected");
  const sortedQuotes = [...activeQuotes].sort((a, b) => (a.total_price ?? a.base_price) - (b.total_price ?? b.base_price));
  const recommendedId = sortedQuotes[0]?.id;
  const selectedQuote = quotes.find((q) => q.status === "selected");
  const providerName = order?.provider?.full_name ?? order?.provider_name;
  const providerPhone = order?.provider?.phone ?? order?.provider_phone;
  const canSelectQuote = order?.status === "pending" && !order.provider_id;
  const showQuoteList = canSelectQuote && sortedQuotes.length > 0;
  const showQuoteBanner = canSelectQuote && activeQuotes.length > 0;
  const isAwaitingProviderAccept = order?.status === "matched" && !!order?.deposit_paid;
  const isProviderConfirmed =
    order?.status === "accepted" ||
    order?.status === "picking_up" ||
    order?.status === "in_progress";
  const canCancel = order && ["pending", "accepted", "matched"].includes(order.status);

  return (
    <div className="min-h-screen bg-[#F4F6FA] pb-10">
      <div className="max-w-6xl mx-auto px-4 pt-5">
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/don-hang"
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50"
          >
            <ArrowLeft size={18} style={{ color: NAVY }} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold" style={{ color: NAVY }}>Chi tiết đơn hàng</h1>
            {order && (
              <p className="text-sm text-gray-400 font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#2563EB] transition-colors"
          >
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-2xl" />
            <div className="grid lg:grid-cols-3 gap-4">
              <Skeleton className="h-64 lg:col-span-2 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          </div>
        ) : !order ? (
          <div className="text-center py-20 text-gray-500">Không tìm thấy đơn hàng</div>
        ) : (
          <>
            {order.status !== "cancelled" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-5 mb-4">
                <div className="flex items-start justify-between relative">
                  <div
                    className="absolute top-5 left-[8%] right-[8%] h-0.5 bg-gray-200"
                    style={{
                      background: `linear-gradient(to right, ${BLUE} ${(stepIdx / (STEPS.length - 1)) * 100}%, #E5E7EB ${(stepIdx / (STEPS.length - 1)) * 100}%)`,
                    }}
                  />
                  {STEPS.map((step, i) => {
                    const done = i <= stepIdx;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center z-10 flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                            done ? "border-[#2563EB] bg-[#2563EB]" : "border-gray-200 bg-white",
                          )}
                        >
                          <Icon size={16} className={done ? "text-white" : "text-gray-400"} />
                        </div>
                        <span
                          className={cn(
                            "text-[10px] sm:text-[11px] text-center mt-2 font-semibold leading-tight px-0.5",
                            done ? "text-[#2563EB]" : "text-gray-400",
                          )}
                        >
                          {stepLabel(step, order)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {showQuoteBanner && (
              <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Bell size={16} className="text-amber-600 shrink-0" />
                  <p className="text-sm font-semibold text-amber-900 truncate">
                    Có báo giá mới từ đối tác vận chuyển
                  </p>
                </div>
                <span className="text-xs text-amber-700 shrink-0">{formatDate(order.created_at)}</span>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-5 items-start">
              <div className="lg:col-span-2 space-y-4">
                {order.quote_request && !isProviderConfirmed && !isAwaitingProviderAccept && (
                  <div>
                    <h2 className="text-base font-bold mb-3" style={{ color: NAVY }}>
                      Báo giá từ nhà xe
                    </h2>

                    {sortedQuotes.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                        <Truck size={36} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-semibold text-gray-800">Chưa có báo giá</p>
                        <p className="text-sm text-gray-500 mt-1">Nhà xe đang xem yêu cầu — tự cập nhật mỗi 12 giây</p>
                      </div>
                    ) : showQuoteList ? (
                      <div className="space-y-3">
                        {sortedQuotes.map((q) => {
                          const isRecommended = q.id === recommendedId && canSelectQuote && q.status === "submitted";
                          const isSelected = q.status === "selected";
                          const rating = q.provider_rating ?? 4.5;
                          const reviews = q.provider_review_count ?? 0;
                          const name = q.provider_name ?? "Nhà xe";

                          return (
                            <div
                              key={q.id}
                              className={cn(
                                "relative bg-white rounded-2xl border p-4 sm:p-5 transition-shadow",
                                isRecommended || isSelected
                                  ? "border-[#2563EB] shadow-md shadow-blue-100/50"
                                  : "border-gray-100 shadow-sm",
                              )}
                            >
                              {isRecommended && (
                                <span className="absolute -top-px right-4 bg-[#2563EB] text-white text-[10px] font-bold px-3 py-1 rounded-b-lg uppercase tracking-wide">
                                  Đề xuất
                                </span>
                              )}
                              {isSelected && (
                                <span className="absolute -top-px right-4 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-b-lg">
                                  Đã chọn
                                </span>
                              )}

                              <Link
                                href={`/don-hang/${id}/bao-gia/${q.id}`}
                                className="flex flex-col sm:flex-row sm:items-center gap-4 group"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {q.provider_avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={q.provider_avatar_url}
                                      alt=""
                                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 shrink-0 group-hover:border-[#2563EB]/40 transition-colors"
                                    />
                                  ) : (
                                    <div
                                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                                      style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}
                                    >
                                      {name[0]?.toUpperCase() ?? "N"}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold text-gray-900 truncate group-hover:text-[#2563EB] transition-colors">
                                      {name}
                                    </p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          size={12}
                                          className={i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-200"}
                                        />
                                      ))}
                                      <span className="text-xs text-gray-400 ml-1">({reviews})</span>
                                    </div>
                                    <span className="text-xs font-semibold text-[#2563EB] mt-1 inline-block">
                                      Xem chi tiết & đánh giá →
                                    </span>
                                  </div>
                                </div>

                                <div className="sm:text-right shrink-0 flex items-center gap-2 sm:block">
                                  <p className="text-xl font-extrabold" style={{ color: NAVY }}>
                                    {formatVND(q.total_price ?? q.base_price)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1 max-w-[220px] sm:ml-auto line-clamp-2">
                                    {quoteTags(q)}
                                  </p>
                                  <ChevronRight size={18} className="text-gray-300 sm:hidden shrink-0" />
                                </div>
                              </Link>

                              {canSelectQuote && q.status === "submitted" && (
                                <div className="mt-4 flex justify-end gap-2">
                                  <Link
                                    href={`/don-hang/${id}/bao-gia/${q.id}`}
                                    className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
                                  >
                                    Chi tiết
                                  </Link>
                                  <button
                                    type="button"
                                    disabled={acting}
                                    onClick={() => selectQuote(q.id)}
                                    className={cn(
                                      "px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50",
                                      isRecommended
                                        ? "bg-[#2563EB] text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                                        : "bg-white border-2 border-[#2563EB] text-[#2563EB] hover:bg-blue-50",
                                    )}
                                  >
                                    {isRecommended ? "Chọn ngay" : "Chọn"}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                )}

                {(providerName || selectedQuote) && order.status !== "pending" && (
                  <div className="bg-white rounded-2xl border border-green-200 p-5 shadow-sm">
                    <h3 className="font-bold mb-2" style={{ color: NAVY }}>Nhà vận chuyển đã chọn</h3>
                    <p className="font-semibold text-gray-900">{providerName ?? selectedQuote?.provider_name}</p>
                    {selectedQuote && (
                      <p className="text-lg font-bold mt-1 text-[#2563EB]">
                        {formatVND(selectedQuote.total_price)}
                      </p>
                    )}
                    {providerPhone && (
                      <a href={`tel:${providerPhone}`} className="block mt-3">
                        <Button variant="outline" className="w-full gap-2 rounded-xl">
                          <Phone size={16} /> Gọi nhà xe
                        </Button>
                      </a>
                    )}
                    {order.status === "matched" && !order.deposit_paid && (
                      <Button
                        className="w-full mt-3 gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700"
                        loading={acting}
                        onClick={payDeposit}
                      >
                        <CreditCard size={16} /> Đặt cọc để xác nhận
                      </Button>
                    )}
                    {isAwaitingProviderAccept && (
                      <p className="text-sm text-amber-700 mt-3 flex items-center gap-2 font-semibold">
                        <Clock size={16} /> Đã đặt cọc — chờ nhà xe xác nhận đơn
                      </p>
                    )}
                    {isProviderConfirmed && (
                      <p className="text-sm text-emerald-600 mt-3 flex items-center gap-2 font-semibold">
                        <CheckCircle size={16} /> Nhà xe đã xác nhận — chờ đến giờ lấy đồ
                      </p>
                    )}
                  </div>
                )}

                {(order.total_price || order.estimated_price || order.final_price) &&
                  order.status !== "pending" &&
                  !order.quote_request && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                      <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: NAVY }}>
                        <Package size={16} /> Thanh toán
                      </h3>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tổng giá</span>
                        <span className="font-bold">
                          {formatVND(order.final_price ?? order.total_price ?? order.estimated_price ?? 0)}
                        </span>
                      </div>
                      {order.deposit_paid && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <CheckCircle size={14} /> Đã đặt cọc
                        </p>
                      )}
                    </div>
                  )}

                {order.status === "completed" && (
                  <Link href="/cho-sinh-vien">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2">
                        <Star size={18} className="text-amber-500" />
                        <span className="font-semibold text-sm text-gray-900">Đánh giá trên chợ SV</span>
                      </div>
                      <ChevronRight size={18} className="text-gray-400" />
                    </div>
                  </Link>
                )}
              </div>

              <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 pt-5 pb-4">
                    <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Lộ trình</h3>
                    <div className="relative pl-1">
                      <div className="absolute left-[11px] top-6 bottom-6 w-0 border-l-2 border-dashed border-gray-200" />
                      <div className="flex gap-3 mb-5 relative">
                        <div className="w-6 h-6 rounded-full bg-[#2563EB] ring-4 ring-blue-50 shrink-0 z-10" />
                        <div className="min-w-0 pt-0.5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Điểm đi</p>
                          <p className="text-sm font-bold text-gray-900">{shortPlace(order.pickup_address)}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{order.pickup_address}</p>
                        </div>
                      </div>
                      <div className="flex gap-3 relative">
                        <div className="w-6 h-6 rounded-full bg-amber-500 ring-4 ring-amber-50 shrink-0 z-10" />
                        <div className="min-w-0 pt-0.5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Điểm đến</p>
                          <p className="text-sm font-bold text-gray-900">{shortPlace(order.dropoff_address)}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{order.dropoff_address}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative h-36 bg-[#1a2332] mx-4 mb-4 rounded-xl overflow-hidden">
                    <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_40%,#2563EB_0%,transparent_50%),radial-gradient(circle_at_70%_60%,#3B82F6_0%,transparent_40%)]" />
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      <path
                        d="M 40 100 Q 120 40 200 80 T 320 50"
                        fill="none"
                        stroke="#60A5FA"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute top-[72px] left-[36px] w-3 h-3 rounded-full bg-blue-400 ring-2 ring-white" />
                    <div className="absolute top-[42px] right-[48px] w-3 h-3 rounded-full bg-amber-400 ring-2 ring-white" />
                    <p className="absolute bottom-2 left-3 text-[10px] text-white/50">Bản đồ minh họa</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Thao tác</h3>
                  <div className="space-y-2.5">
                    {order.provider_id && (
                      <Link href={`/tin-nhan?orderId=${order.id}`}>
                        <button
                          type="button"
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-colors"
                          style={{ backgroundColor: NAVY }}
                        >
                          <MessageCircle size={18} /> Nhắn tin
                        </button>
                      </Link>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        disabled={acting}
                        onClick={cancelOrder}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={18} /> Hủy đơn
                      </button>
                    )}
                  </div>
                  {canCancel && (
                    <p className="text-[11px] text-gray-400 text-center mt-3 leading-relaxed">
                      Đơn hàng có thể hủy miễn phí trước khi nhà xe xác nhận
                    </p>
                  )}
                </div>

                {!order.quote_request && order.status !== "cancelled" && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <p className="text-xs text-gray-400 mb-1">Trạng thái</p>
                    <p className="text-sm font-bold" style={{ color: NAVY }}>
                      {getOrderStatusLabel(order.status)}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(order.created_at)}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
