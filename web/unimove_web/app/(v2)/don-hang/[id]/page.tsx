"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Phone, Star, CheckCircle, XCircle, CreditCard,
  AlertTriangle, ShieldCheck, Info, X, ChevronDown, ChevronUp,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi, quotesApi, paymentsApi, providersApi, devApi, reviewsApi } from "@/lib/api";
import { formatVND, formatDate } from "@/lib/utils";
import { useUIStore } from "@/lib/stores";
import { getStoredUser } from "@/lib/auth";

/* ─── Interfaces (unchanged) ──────────────────────────────────── */
interface OrderDetail {
  id: string; status: string; service_type: string; quote_request?: boolean;
  pickup_address: string; dropoff_address: string; description?: string;
  estimated_price?: number; final_price?: number; total_price?: number;
  deposit_amount?: number; deposit_paid?: boolean; created_at: string;
  provider_accepted_at?: string; scheduled_pickup_time?: string;
  cancellation_reason?: string; cancelled_at?: string;
  provider?: { id: string; full_name: string; phone: string; rating: number; vehicle_type?: string; total_reviews?: number };
  provider_name?: string;
  my_review?: { id: string; rating: number; comment?: string; tags: string[]; created_at: string };
}

interface Quote {
  id: string; provider_id: string; total_price: number; base_price: number;
  note?: string; provider_name?: string; status: string;
}

interface CancelEstimate {
  cancellable: boolean; status: string;
  deposit_amount: number; fee_percent: number; fee_amount: number; refund_amount: number;
}

interface ProviderReview {
  id: string; rating: number; title?: string; comment?: string;
  tags: string[]; created_at: string;
  customer?: { full_name: string };
}

interface ProviderProfile {
  id: string; full_name: string; business_name?: string; avatar_url?: string;
  rating: number; total_reviews: number; is_verified: boolean;
  vehicle_type?: string; vehicle_plate?: string;
  reviews_summary?: {
    average_rating: number; total_reviews: number;
    rating_5_count: number; rating_4_count: number; rating_3_count: number;
    rating_2_count: number; rating_1_count: number;
    avg_service_quality: number; avg_punctuality: number;
    avg_professionalism: number; avg_value_for_money: number;
  };
  reviews: ProviderReview[];
}

/* ─── Static config ─────────────────────────────────────────────── */
const CANCEL_REASONS = [
  "Tôi đổi lịch chuyển nhà",
  "Tìm được nhà xe khác phù hợp hơn",
  "Báo giá quá cao",
  "Tôi nhập sai địa chỉ",
  "Thay đổi kế hoạch",
  "Khác",
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: "Chờ báo giá",     color: "#D97706", bg: "#FFFBEB" },
  matched:     { label: "Chờ thanh toán",  color: "#2563EB", bg: "#EFF6FF" },
  accepted:    { label: "Đã xác nhận",     color: "#059669", bg: "#ECFDF5" },
  scheduled:   { label: "Đã lên lịch",     color: "#0891B2", bg: "#ECFEFF" },
  picking_up:  { label: "Đang đến lấy",    color: "#7C3AED", bg: "#F5F3FF" },
  in_progress: { label: "Đang vận chuyển", color: "#7C3AED", bg: "#F5F3FF" },
  completed:   { label: "Hoàn thành",      color: "#059669", bg: "#ECFDF5" },
  cancelled:   { label: "Đã huỷ",          color: "#DC2626", bg: "#FEF2F2" },
};

const SERVICE_META: Record<string, { emoji: string; label: string }> = {
  moving:        { emoji: "📦", label: "Chuyển nhà" },
  delivery:      { emoji: "🚚", label: "Giao hàng" },
  heavy_lifting: { emoji: "💪", label: "Khuân vác" },
};

const V_STEPS = [
  { key: "pending",     label: "Đặt đơn thành công",   sub: "Đang chờ báo giá từ nhà xe",        icon: "📋" },
  { key: "matched",     label: "Đã chọn nhà xe",        sub: "Chờ thanh toán đặt cọc",            icon: "✅" },
  { key: "accepted",    label: "Đặt cọc thành công",    sub: "Nhà xe đã xác nhận chuyến hàng",    icon: "💳" },
  { key: "picking_up",  label: "Nhà xe đang đến lấy",   sub: "Vui lòng chuẩn bị hàng hoá sẵn sàng", icon: "🚚" },
  { key: "in_progress", label: "Đang vận chuyển",       sub: "Hàng hoá đang trên đường đến bạn",   icon: "📦" },
  { key: "completed",   label: "Giao hàng thành công",  sub: "Cảm ơn bạn đã sử dụng UniMove!",    icon: "🎉" },
];

const STATUS_STEP: Record<string, number> = {
  pending: 0, matched: 1, accepted: 2, picking_up: 3, in_progress: 4, completed: 5,
};

/* ─── Page ───────────────────────────────────────────────────────── */
export default function DonHangDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useUIStore();

  /* state (unchanged) */
  const [order, setOrder]       = useState<OrderDetail | null>(null);
  const [quotes, setQuotes]     = useState<Quote[]>([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(false);

  const [cancelStep, setCancelStep]           = useState<0 | 1 | 2>(0);
  const [estimate, setEstimate]               = useState<CancelEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [selectedReason, setSelectedReason]   = useState("");
  const [customReason, setCustomReason]       = useState("");
  const [cancelling, setCancelling]           = useState(false);
  const [cancellingTimeout, setCancellingTimeout] = useState(false);

  const [drawerProvider, setDrawerProvider]   = useState<ProviderProfile | null>(null);
  const [loadingProfile, setLoadingProfile]   = useState(false);

  /* UI state for route expand */
  const [showFullRoute, setShowFullRoute] = useState(false);

  /* review form state */
  const [reviewStars,   setReviewStars]   = useState(0);
  const [reviewTags,    setReviewTags]    = useState<string[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  /* ── functions (ALL unchanged) ── */
  const openProviderDrawer = async (providerId: string) => {
    setLoadingProfile(true);
    setDrawerProvider(null);
    try {
      const res = await providersApi.getById(providerId, { reviews_limit: 5 });
      if (res.success && res.data) setDrawerProvider(res.data as ProviderProfile);
    } finally {
      setLoadingProfile(false);
    }
  };

  const load = async () => {
    const r = await ordersApi.get(id);
    if (r.success && r.data) setOrder(r.data as OrderDetail);
    if ((r.data as OrderDetail)?.quote_request) {
      const q = await quotesApi.list(id);
      const qd = q.data as { quotes?: Quote[] };
      setQuotes(qd?.quotes ?? (Array.isArray(q.data) ? q.data as Quote[] : []));
    }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, [id]);

  // Polling 15s khi đơn đang active — tự cập nhật step mà không cần reload
  useEffect(() => {
    const ACTIVE = ["pending", "matched", "accepted", "scheduled", "picking_up", "picked_up", "in_progress", "delivering"];
    if (!order || !ACTIVE.includes(order.status)) return;
    const timer = setInterval(() => { load(); }, 15_000);
    return () => clearInterval(timer);
  }, [order?.status]);

  const submitReview = async () => {
    if (reviewStars === 0) return;
    setSubmittingReview(true);
    try {
      await reviewsApi.submit(id, {
        rating: reviewStars,
        comment: reviewComment.trim() || undefined,
        tags: reviewTags,
      });
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Gửi đánh giá thất bại");
    } finally {
      setSubmittingReview(false);
    }
  };

  const openCancelFlow = async () => {
    setCancelStep(1);
    setLoadingEstimate(true);
    try {
      const res = await ordersApi.getCancelEstimate(id);
      setEstimate(res.data as CancelEstimate);
    } catch { setEstimate(null); }
    finally { setLoadingEstimate(false); }
  };

  const confirmCancel = async () => {
    const reason = selectedReason === "Khác" ? customReason.trim() : selectedReason;
    if (!reason) { showError("Vui lòng chọn lý do hủy"); return; }
    setCancelling(true);
    try {
      await ordersApi.cancel(id, reason);
      showSuccess("Đã hủy đơn hàng");
      setCancelStep(0);
      await load();
    } catch (e) { showError(e instanceof Error ? e.message : "Không thể hủy đơn"); }
    finally { setCancelling(false); }
  };

  const selectQuote = async (quoteId: string) => {
    setActing(true);
    try {
      await quotesApi.select(id, quoteId);
      showSuccess("Đã chọn báo giá");
      await load();
    } catch (e) { showError(e instanceof Error ? e.message : "Không thể chọn báo giá"); }
    finally { setActing(false); }
  };

  const payDeposit = async () => {
    if (!order) return;
    const amount = order.deposit_amount ?? Math.round((order.total_price ?? order.estimated_price ?? 0) * 0.3);
    if (!amount) { showError("Chưa có số tiền cọc"); return; }
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
    } catch (e) { showError(e instanceof Error ? e.message : "Thanh toán thất bại"); }
    finally { setActing(false); }
  };

  const devSkipPayment = async () => {
    if (!order) return;
    setActing(true);
    try {
      await devApi.simulatePayment(order.id);
      showSuccess("✅ Giả lập thanh toán thành công");
      await load();
    } catch (e) { showError(e instanceof Error ? e.message : "Lỗi giả lập"); }
    finally { setActing(false); }
  };

  const cancelByTimeout = async () => {
    if (!confirm("Bạn chắc chắn muốn hủy đơn vì nhà xe không phản hồi? Tiền cọc sẽ được hoàn lại.")) return;
    setCancellingTimeout(true);
    try {
      await ordersApi.cancelTimeout(id);
      showSuccess("Đã hủy đơn. Yêu cầu hoàn tiền đang chờ xử lý.");
      await load();
    } catch (e) { showError(e instanceof Error ? e.message : "Không thể hủy đơn"); }
    finally { setCancellingTimeout(false); }
  };

  /* ── derived (unchanged logic) ── */
  const canCancel = order && ["pending", "matched", "accepted", "scheduled"].includes(order.status);

  // Banner hủy: accepted + còn ≤15 phút đến giờ hẹn mà provider chưa bấm "Đang đến lấy"
  const pickupTime = order?.scheduled_pickup_time ? new Date(order.scheduled_pickup_time).getTime() : 0;
  const canCancelTimeout = order?.status === "accepted" && pickupTime > 0 && Date.now() >= pickupTime - 15 * 60 * 1000;
  const hasProviderLinked = order && (
    !!order.provider || ["matched", "accepted", "picking_up", "in_progress", "completed"].includes(order.status)
  );
  const depositNeeded = order && order.deposit_amount && !order.deposit_paid &&
    ["matched", "accepted", "pending"].includes(order.status);
  const depositAmount = order?.deposit_amount ??
    Math.round((order?.total_price ?? order?.estimated_price ?? 0) * 0.3);

  /* ── helpers ── */
  const shortAddr = (addr: string) => {
    if (addr.length <= 42) return addr;
    return addr.split(",").slice(0, 2).join(",").trim().slice(0, 40) + "…";
  };
  const totalPrice = order ? (order.final_price ?? order.total_price ?? order.estimated_price ?? 0) : 0;
  const hasPrice = totalPrice > 0;
  const selectedQuote = quotes.find(q => q.status === "selected");
  const statusCfg = order
    ? order.status === "matched" && order.deposit_paid
      ? { label: "Đặt cọc thành công", color: "#059669", bg: "#ECFDF5" }
      : (STATUS_CFG[order.status] ?? { label: order.status, color: "#6B7280", bg: "#F9FAFB" })
    : null;

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* ── Loading ── */}
      {loading && (
        <div className="max-w-lg mx-auto px-4 pt-16 space-y-3">
          {[80, 160, 120, 100].map((h, i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl shadow-sm" style={{ height: h }} />
          ))}
        </div>
      )}

      {/* ── Not found ── */}
      {!loading && !order && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <p className="text-4xl">📦</p>
          <p className="text-gray-500 font-medium">Không tìm thấy đơn hàng</p>
          <Link href="/don-hang" className="text-sm text-[#2563EB] font-semibold">← Về danh sách đơn</Link>
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && order && (
        <>
          <div className={`max-w-lg mx-auto ${depositNeeded ? "pb-44 lg:pb-32" : "pb-8"}`}>

            {/* ─ 1. Compact sticky header ─ */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
              <div className="flex items-center gap-2.5 px-4 py-3">
                <Link
                  href="/don-hang"
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0"
                >
                  <ArrowLeft size={18} className="text-gray-700" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{SERVICE_META[order.service_type]?.emoji ?? "📦"}</span>
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {SERVICE_META[order.service_type]?.label ?? "Đơn hàng"}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    #{order.id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)}
                  </p>
                </div>
                {statusCfg && (
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap"
                    style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
                  >
                    {statusCfg.label}
                  </span>
                )}
              </div>
            </div>

            {/* ─ 2. Vertical stepper ─ */}
            {order.status !== "cancelled" && (
              <div className="bg-white rounded-2xl shadow-sm mx-4 mt-4 px-5 py-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Tiến trình đơn hàng</p>
                <div>
                  {V_STEPS.map((step, i) => {
                    const currentIdx = (order.status === "matched" && order.deposit_paid)
                      ? STATUS_STEP["accepted"]
                      : (STATUS_STEP[order.status] ?? 0);
                    const done = i < currentIdx;
                    const current = i === currentIdx;
                    const isLast = i === V_STEPS.length - 1;
                    return (
                      <div key={step.key} className="flex gap-3">
                        {/* Dot + line */}
                        <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                            style={
                              done    ? { backgroundColor: "#2563EB", color: "#fff" }
                              : current ? { backgroundColor: "#EFF6FF", color: "#2563EB", border: "2px solid #2563EB" }
                              : { backgroundColor: "#F9FAFB", color: "#9CA3AF", border: "2px solid #E5E7EB" }
                            }
                          >
                            {done ? "✓" : step.icon}
                          </div>
                          {!isLast && (
                            <div
                              className="w-px my-1 rounded-full"
                              style={{ flex: 1, minHeight: 16, backgroundColor: done ? "#2563EB" : "#E5E7EB" }}
                            />
                          )}
                        </div>
                        {/* Text */}
                        <div className={`flex-1 ${isLast ? "pb-0" : "pb-3"}`}>
                          <p className={`text-sm leading-snug transition-all ${
                            done    ? "text-gray-400 font-medium"
                            : current ? "text-gray-900 font-bold"
                            : "text-gray-300 font-medium"
                          }`}>{step.label}</p>
                          {current && (
                            <p className="text-xs text-[#2563EB] mt-0.5 leading-relaxed">{step.sub}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─ Cancelled notice ─ */}
            {order.status === "cancelled" && (
              <div className="mx-4 mt-4 rounded-2xl bg-red-50 border border-red-100 p-5 flex gap-3 items-start">
                <span className="text-2xl shrink-0">❌</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-red-700">Đơn hàng đã bị huỷ</p>
                  {order.cancellation_reason && (
                    <p className="text-sm text-red-600 mt-1 font-medium">{order.cancellation_reason}</p>
                  )}
                  {order.cancelled_at && (
                    <p className="text-xs text-red-400 mt-0.5">Huỷ lúc {formatDate(order.cancelled_at)}</p>
                  )}
                  {order.deposit_paid && (
                    <p className="text-sm text-red-500 mt-1.5">Tiền đặt cọc sẽ được hoàn trong 1–3 ngày làm việc.</p>
                  )}
                </div>
              </div>
            )}

            {/* ─ 3. Selected provider card ─ */}
            {(order.provider || (selectedQuote && order.status !== "pending")) && (
              <div className="mx-4 mt-3 rounded-2xl bg-blue-50 border border-blue-200 p-4">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">Nhà vận chuyển được chọn</p>
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                    style={{ backgroundColor: "#2563EB" }}
                  >
                    {(order.provider?.full_name ?? selectedQuote?.provider_name ?? "?")[0].toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {order.provider?.full_name ?? selectedQuote?.provider_name ?? "Nhà xe"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {order.provider?.vehicle_type && (
                        <span className="text-xs text-gray-500">🚚 {order.provider.vehicle_type}</span>
                      )}
                      {(order.provider?.rating ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-600">
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                          <span className="font-semibold">{order.provider!.rating.toFixed(1)}</span>
                          {order.provider?.total_reviews ? <span className="text-gray-400">({order.provider.total_reviews} đánh giá)</span> : null}
                        </span>
                      )}
                    </div>
                    {/* Price from selected quote */}
                    {selectedQuote && (
                      <p className="text-sm font-bold text-[#2563EB] mt-1">{formatVND(selectedQuote.total_price)}</p>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    {order.provider?.phone && (
                      <a href={`tel:${order.provider.phone}`}>
                        <div className="w-9 h-9 rounded-full bg-white border border-blue-200 flex items-center justify-center">
                          <Phone size={15} className="text-[#2563EB]" />
                        </div>
                      </a>
                    )}
                    {selectedQuote && (
                      <button
                        onClick={() => openProviderDrawer(selectedQuote.provider_id)}
                        className="text-[11px] text-[#2563EB] font-semibold flex items-center gap-0.5"
                      >
                        <Info size={11} /> Xem hồ sơ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─ 4. Quote list ─ */}
            {order.quote_request && quotes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm mx-4 mt-3 px-4 py-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Báo giá nhận được · {quotes.length} nhà xe
                </p>
                <div className="space-y-2">
                  {quotes.map((q) => {
                    const isSelected = q.status === "selected";
                    const canChoose = order.status === "pending" && !order.provider;
                    return (
                      <div
                        key={q.id}
                        className="rounded-xl border px-3 py-2.5 flex items-center gap-2"
                        style={{
                          borderColor: isSelected ? "#2563EB" : "#F3F4F6",
                          backgroundColor: isSelected ? "#EFF6FF" : "#FAFAFA",
                          opacity: !isSelected && order.status !== "pending" ? 0.5 : 1,
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">{q.provider_name ?? "Nhà xe"}</p>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-[#2563EB] bg-blue-100 px-1.5 py-0.5 rounded-full shrink-0">✓ Đã chọn</span>
                            )}
                          </div>
                          <p className="text-base font-bold text-[#2563EB]">{formatVND(q.total_price)}</p>
                          {q.note && q.note !== "Sẵn sàng" && (
                            <p className="text-xs text-gray-400 truncate">{q.note}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => openProviderDrawer(q.provider_id)}
                            className="text-[11px] text-gray-400 font-medium flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-white border border-gray-200 transition-colors"
                          >
                            <Info size={11} /> Xem
                          </button>
                          {canChoose && !isSelected && (
                            <Button size="sm" className="h-7 px-3 text-xs" loading={acting} onClick={() => selectQuote(q.id)}>
                              Chọn
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─ 5. Route ─ */}
            <div className="bg-white rounded-2xl shadow-sm mx-4 mt-3 px-4 py-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Lộ trình</p>
              <div className="flex gap-3">
                {/* Timeline dots */}
                <div className="flex flex-col items-center pt-1 shrink-0">
                  <div className="w-3 h-3 rounded-full border-2 border-[#2563EB] bg-[#EFF6FF]" />
                  <div className="w-px flex-1 bg-gray-200 my-1.5" style={{ minHeight: 24 }} />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                {/* Addresses */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Điểm lấy hàng</p>
                    <p className="text-sm text-gray-800 leading-snug">
                      {showFullRoute ? order.pickup_address : shortAddr(order.pickup_address)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Điểm giao hàng</p>
                    <p className="text-sm text-gray-800 leading-snug">
                      {showFullRoute ? order.dropoff_address : shortAddr(order.dropoff_address)}
                    </p>
                  </div>
                </div>
              </div>
              {(order.pickup_address.length > 42 || order.dropoff_address.length > 42) && (
                <button
                  onClick={() => setShowFullRoute(!showFullRoute)}
                  className="mt-2.5 flex items-center gap-1 text-xs text-[#2563EB] font-medium"
                >
                  {showFullRoute
                    ? <><ChevronUp size={12} /> Thu gọn địa chỉ</>
                    : <><ChevronDown size={12} /> Xem địa chỉ đầy đủ</>
                  }
                </button>
              )}
              {order.description && (
                <p className="mt-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed">{order.description}</p>
              )}
            </div>

            {/* ─ 6. Payment ─ */}
            {hasPrice && (
              <div className="mx-4 mt-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-4">
                <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-3">💳 Thanh toán</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Chi phí vận chuyển</span>
                    <span className="font-bold text-gray-900">{formatVND(totalPrice)}</span>
                  </div>
                  {order.deposit_amount && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Đặt cọc trước</span>
                        <span className="font-bold text-yellow-700">{formatVND(order.deposit_amount)}</span>
                      </div>
                      <div className="h-px bg-yellow-200 my-1" />
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Thanh toán sau khi hoàn thành</span>
                        <span className="font-semibold text-gray-600">{formatVND(totalPrice - order.deposit_amount)}</span>
                      </div>
                    </>
                  )}
                </div>
                {order.deposit_paid ? (
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-yellow-200">
                    <CheckCircle size={13} className="text-green-600" />
                    <p className="text-xs text-green-700 font-semibold">Đã thanh toán đặt cọc</p>
                  </div>
                ) : order.deposit_amount ? (
                  <p className="text-[11px] text-yellow-600 mt-3 leading-relaxed">
                    🔒 Khoản đặt cọc được giữ an toàn và hoàn lại nếu nhà xe không đến đúng hẹn.
                  </p>
                ) : null}
              </div>
            )}

            {/* ─ 7. Secondary actions ─ */}
            <div className="mx-4 mt-4 space-y-2">
              {hasProviderLinked && (
                <Link href={`/tin-nhan?orderId=${order.id}`} className="block">
                  <button className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                    <MessageSquare size={15} className="text-[#2563EB]" />
                    Nhắn tin với nhà xe
                  </button>
                </Link>
              )}
              {canCancel && (
                <button
                  onClick={openCancelFlow}
                  className="w-full h-10 flex items-center justify-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-500 transition-colors"
                >
                  <XCircle size={14} /> Huỷ đơn hàng
                </button>
              )}
              {canCancelTimeout && (
                <button
                  onClick={cancelByTimeout}
                  disabled={cancellingTimeout}
                  className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-center gap-3 hover:bg-orange-100 transition-colors disabled:opacity-60"
                >
                  <AlertTriangle size={16} className="text-orange-500 shrink-0" />
                  <div className="text-left flex-1">
                    <p className="text-sm font-semibold text-orange-700">Nhà xe không phản hồi?</p>
                    <p className="text-xs text-orange-500 mt-0.5">Còn 15 phút đến giờ hẹn mà nhà xe chưa lên đường</p>
                  </div>
                </button>
              )}
            </div>

            {/* ─ 8. Completed: review form or submitted review ─ */}
            {order.status === "completed" && (
              <div className="mx-4 mt-3">
                {order.my_review ? (
                  /* Already reviewed — show submitted card */
                  <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={16} className="text-green-600 shrink-0" />
                      <p className="text-sm font-bold text-green-800">Đánh giá của bạn</p>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={16}
                          fill={s <= order.my_review!.rating ? "#F59E0B" : "none"}
                          stroke={s <= order.my_review!.rating ? "#F59E0B" : "#D1D5DB"} />
                      ))}
                    </div>
                    {order.my_review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {order.my_review.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">{t}</span>
                        ))}
                      </div>
                    )}
                    {order.my_review.comment && (
                      <p className="text-sm text-gray-600 italic">"{order.my_review.comment}"</p>
                    )}
                  </div>
                ) : (
                  /* Review form */
                  <div className="rounded-2xl border border-gray-100 bg-white shadow-sm px-4 py-4 space-y-4">
                    <div>
                      <p className="text-sm font-bold text-gray-800">Đánh giá chuyến đi</p>
                      <p className="text-xs text-gray-400 mt-0.5">Chia sẻ trải nghiệm để giúp các khách hàng khác</p>
                    </div>

                    {/* Stars */}
                    <div className="flex gap-2 justify-center py-1">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setReviewStars(s)} className="transition-transform active:scale-90">
                          <Star size={36}
                            fill={s <= reviewStars ? "#F59E0B" : "none"}
                            stroke={s <= reviewStars ? "#F59E0B" : "#D1D5DB"}
                            strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>
                    {reviewStars > 0 && (
                      <p className="text-center text-sm font-semibold text-amber-500 -mt-2">
                        {["","Rất tệ","Tệ","Bình thường","Tốt","Xuất sắc"][reviewStars]}
                      </p>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {["Cẩn thận","Đúng giờ","Chuyên nghiệp","Thân thiện","Giá tốt","Nhanh chóng","Gọn gàng"].map(tag => {
                        const on = reviewTags.includes(tag);
                        return (
                          <button key={tag}
                            onClick={() => setReviewTags(p => on ? p.filter(t => t !== tag) : [...p, tag])}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                            style={on
                              ? { backgroundColor: "#EFF6FF", borderColor: "#2563EB", color: "#2563EB" }
                              : { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#6B7280" }}>
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    {/* Comment */}
                    <textarea
                      placeholder="Nhận xét thêm (tuỳ chọn)..."
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    />

                    <Button
                      className="w-full h-11 rounded-2xl text-sm font-bold"
                      style={{ backgroundColor: reviewStars > 0 ? "#2563EB" : undefined }}
                      disabled={reviewStars === 0}
                      loading={submittingReview}
                      onClick={submitReview}
                    >
                      Gửi đánh giá
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─ Sticky bottom bar (deposit CTA) ─ */}
          {depositNeeded && (
            <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.09)]">
              <div className="max-w-lg mx-auto px-4 py-3 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <p className="text-[10px] text-gray-400 font-medium leading-none mb-0.5">Đặt cọc</p>
                    <p className="text-xl font-extrabold text-gray-900 leading-none">{formatVND(depositAmount)}</p>
                  </div>
                  <Button
                    className="flex-1 h-12 rounded-2xl text-sm font-bold tracking-wide shadow-md"
                    style={{ backgroundColor: "#2563EB" }}
                    loading={acting}
                    onClick={payDeposit}
                  >
                    Đặt cọc ngay →
                  </Button>
                </div>
                {process.env.NODE_ENV === "development" && (
                  <button
                    onClick={devSkipPayment}
                    disabled={acting}
                    className="w-full h-8 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    🧪 Dev: Bỏ qua PayOS (giả lập thành công)
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ Modal bước 1: Chính sách hoàn tiền ══ */}
      {cancelStep === 1 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <AlertTriangle size={22} className="text-amber-500 shrink-0" />
              <h2 className="text-lg font-bold">Chính sách hủy đơn</h2>
            </div>
            {loadingEstimate ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-8 rounded-xl" />)}</div>
            ) : estimate ? (
              <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100 text-sm">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-gray-500">Số tiền đã cọc</span>
                  <span className="font-semibold">{formatVND(estimate.deposit_amount)}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-gray-500">Phí hủy ({estimate.fee_percent}%)</span>
                  <span className="font-semibold text-red-500">- {formatVND(estimate.fee_amount)}</span>
                </div>
                <div className="flex justify-between px-4 py-3 bg-green-50 rounded-b-2xl">
                  <span className="font-bold text-green-700">Hoàn lại</span>
                  <span className="font-bold text-green-700">{formatVND(estimate.refund_amount)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Không thể tải thông tin hoàn tiền.</p>
            )}
            <div className="text-xs text-gray-400 leading-relaxed">
              Yêu cầu hoàn tiền sẽ được admin xét duyệt trong 1–3 ngày làm việc.{" "}
              <Link href="/chinh-sach-huy-don" className="text-blue-500 underline font-medium">
                Xem chính sách đầy đủ →
              </Link>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setCancelStep(0)}>Quay lại</Button>
              <Button className="flex-1" onClick={() => setCancelStep(2)}>Tiếp tục</Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal bước 2: Lý do hủy ══ */}
      {cancelStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8 space-y-4">
            <h2 className="text-lg font-bold">Lý do hủy đơn</h2>
            <div className="space-y-2">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedReason(r)}
                  className="w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors"
                  style={{
                    borderColor: selectedReason === r ? "#2563EB" : "#E5E7EB",
                    backgroundColor: selectedReason === r ? "#EFF6FF" : "white",
                    color: selectedReason === r ? "#2563EB" : "#374151",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            {selectedReason === "Khác" && (
              <textarea
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="Nhập lý do..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setCancelStep(1)}>Quay lại</Button>
              <Button
                variant="destructive" className="flex-1" loading={cancelling}
                disabled={!selectedReason || (selectedReason === "Khác" && !customReason.trim())}
                onClick={confirmCancel}
              >
                Xác nhận hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Drawer: Chi tiết nhà xe ══ */}
      {(loadingProfile || drawerProvider) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setDrawerProvider(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl overflow-y-auto"
            style={{ maxHeight: "88vh" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {loadingProfile ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 animate-pulse">
                  <div className="w-14 h-14 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-gray-100" />
                    <div className="h-3 w-24 rounded bg-gray-100" />
                  </div>
                </div>
                {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}
              </div>
            ) : drawerProvider && (
              <div className="px-5 pb-8 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden" style={{ backgroundColor: "#2563EB" }}>
                    {drawerProvider.avatar_url
                      ? <img src={drawerProvider.avatar_url} className="w-full h-full object-cover" alt="" />
                      : (drawerProvider.full_name?.[0] ?? "?").toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-gray-900 text-base">{drawerProvider.business_name || drawerProvider.full_name}</p>
                      {drawerProvider.is_verified && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                          <ShieldCheck size={10} /> Xác minh
                        </span>
                      )}
                    </div>
                    {drawerProvider.vehicle_type && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {drawerProvider.vehicle_type}{drawerProvider.vehicle_plate ? ` · ${drawerProvider.vehicle_plate}` : ""}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setDrawerProvider(null)} className="p-1.5 rounded-full hover:bg-gray-100 shrink-0">
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 text-center">
                    <div className="flex items-center justify-center gap-0.5 mb-0.5">
                      <Star size={13} className="text-amber-500 fill-amber-500" />
                      <span className="text-lg font-bold text-gray-900">{(drawerProvider.reviews_summary?.average_rating ?? drawerProvider.rating).toFixed(1)}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Đánh giá</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 text-center">
                    <span className="text-lg font-bold text-gray-900">{drawerProvider.reviews_summary?.total_reviews ?? drawerProvider.total_reviews}</span>
                    <p className="text-[10px] text-gray-500 mt-0.5">Đơn thành công</p>
                  </div>
                  <div className="rounded-2xl bg-green-50 border border-green-100 p-3 text-center">
                    <span className="text-lg font-bold text-gray-900">
                      {drawerProvider.reviews_summary
                        ? (() => {
                            const s = drawerProvider.reviews_summary;
                            const pos = (s.rating_4_count || 0) + (s.rating_5_count || 0);
                            return Math.round(pos / (s.total_reviews || 1) * 100) + "%";
                          })()
                        : "—"
                      }
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5">Hài lòng</p>
                  </div>
                </div>

                {/* Quality scores */}
                {drawerProvider.reviews_summary && (
                  <div className="rounded-2xl border border-gray-100 p-4 space-y-2.5">
                    <p className="text-sm font-bold text-gray-900 mb-3">Chất lượng dịch vụ</p>
                    {[
                      { label: "Chất lượng", value: drawerProvider.reviews_summary.avg_service_quality },
                      { label: "Đúng giờ",   value: drawerProvider.reviews_summary.avg_punctuality },
                      { label: "Thái độ",    value: drawerProvider.reviews_summary.avg_professionalism },
                      { label: "Giá cả",     value: drawerProvider.reviews_summary.avg_value_for_money },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(value / 5 * 100, 100)}%`, backgroundColor: "#2563EB" }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value > 0 ? value.toFixed(1) : "—"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Star distribution */}
                {drawerProvider.reviews_summary && drawerProvider.reviews_summary.total_reviews > 0 && (
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-sm font-bold text-gray-900 mb-3">Phân bổ sao</p>
                    {[5, 4, 3, 2, 1].map(star => {
                      const s = drawerProvider.reviews_summary!;
                      const count = s[`rating_${star}_count` as keyof typeof s] as number ?? 0;
                      const pct = s.total_reviews > 0 ? count / s.total_reviews * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
                          <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 w-5 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reviews */}
                {drawerProvider.reviews.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-3">Nhận xét gần đây</p>
                    <div className="space-y-3">
                      {drawerProvider.reviews.map(rv => (
                        <div key={rv.id} className="rounded-2xl border border-gray-100 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                {(rv.customer?.full_name?.[0] ?? "?").toUpperCase()}
                              </div>
                              <span className="text-sm font-semibold text-gray-700">{rv.customer?.full_name ?? "Khách hàng"}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} size={11} className={i < rv.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />
                              ))}
                            </div>
                          </div>
                          {rv.comment && <p className="text-sm text-gray-600 leading-relaxed">{rv.comment}</p>}
                          {rv.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {rv.tags.map(tag => (
                                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{tag}</span>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-gray-300 mt-2">{formatDate(rv.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {drawerProvider.reviews.length === 0 && (
                  <div className="text-center py-6 text-sm text-gray-400">Chưa có đánh giá nào</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
