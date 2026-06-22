"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Phone, CheckCircle, XCircle, DollarSign,
  Truck, Camera, AlertTriangle, Clock, Wallet, Layers, Users,
  Image as ImageIcon, Home, X, ArrowRight, Send, MessageSquare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ordersApi, quotesApi } from "@/lib/api";
import { getOrderStatusLabel, getOrderStatusColor, formatVND, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface OrderDetail {
  id: string; status: string; quote_request?: boolean; deposit_paid?: boolean;
  pickup_address: string; dropoff_address: string; delivery_address?: string;
  pickup_notes?: string; delivery_notes?: string;
  pickup_floor?: number; delivery_floor?: number;
  pickup_has_elevator?: boolean; delivery_has_elevator?: boolean;
  requires_helpers?: boolean; number_of_helpers?: number;
  vehicle_size?: string;
  description?: string; dorm_image_urls?: string[];
  estimated_price?: number; created_at: string;
  customer?: { id: string; full_name: string; phone: string };
}

const VEHICLE_LABELS: Record<string, string> = {
  motorbike: "Xe máy", pickup: "Bán tải", van: "Xe van",
  truck_1t: "Xe tải 1 tấn", truck_2t: "Xe tải 2 tấn",
  truck_5t: "Xe tải 5 tấn+", medium_truck: "Xe tải vừa",
  small_truck: "Xe tải nhỏ", large_truck: "Xe tải lớn",
};

/**
 * Strip noise tokens inline (không filter cả chunk), rồi split.
 * Lý do: "Ảnh mô tả: 2 tấm Hẻm: Hẻm hẹp" là 1 chunk → phải strip "Ảnh mô tả: X tấm"
 * trước rồi mới lấy "Hẻm: Hẻm hẹp".
 */
function parseNotes(raw?: string): string[] {
  if (!raw) return [];
  const cleaned = raw
    .replace(/Ảnh mô tả:\s*\d+\s*tấm\s*/gi, "")
    .replace(/Ảnh đính kèm:\s*\d+\s*/gi, "")
    .replace(/Mã báo giá:\s*\S+/gi, "");
  return cleaned
    .split(/\s*·\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export default function ProviderOrderDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { toast } = useToast();

  const [order,           setOrder]           = useState<OrderDetail | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [acting,          setActing]          = useState(false);
  const [price,           setPrice]           = useState("");
  const [quoteNote,       setQuoteNote]       = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason,    setCancelReason]    = useState("");
  const [lightboxIdx,     setLightboxIdx]     = useState<number | null>(null);

  const load = async () => {
    const r = await ordersApi.get(id);
    if (r.success && r.data) setOrder(r.data as OrderDetail);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, [id]);

  /* ── Actions ── */
  const submitQuote = async () => {
    const base = parseInt(price.replace(/\D/g, ""), 10);
    if (!base || base <= 0) { toast("Nhập giá báo hợp lệ", "error"); return; }
    setActing(true);
    try {
      await quotesApi.submit(id, { base_price: base, schedule_fit: "exact_match", note: quoteNote || undefined });
      toast("Đã gửi báo giá", "success");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Gửi báo giá thất bại", "error"); }
    finally { setActing(false); }
  };

  const respond = async (action: "accept" | "reject") => {
    setActing(true);
    try {
      await ordersApi.respond(id, action);
      toast(action === "accept" ? "Đã nhận đơn" : "Đã bỏ qua đơn", action === "accept" ? "success" : "info");
      if (action === "reject") router.push("/orders");
      else await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Thử lại sau", "error"); }
    finally { setActing(false); }
  };

  const lifecycle = async (action: "accept" | "start" | "complete") => {
    setActing(true);
    try {
      if (action === "accept") await ordersApi.accept(id);
      else if (action === "start") await ordersApi.start(id);
      else await ordersApi.complete(id);
      toast("Cập nhật trạng thái thành công", "success");
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : "Lỗi", "error"); }
    finally { setActing(false); }
  };

  const cancelOrder = async () => {
    if (!cancelReason.trim()) { toast("Vui lòng nhập lý do hủy", "error"); return; }
    setActing(true);
    try {
      await ordersApi.cancel(id, cancelReason.trim());
      toast("Đã hủy đơn. Điểm tuân thủ bị trừ.", "info");
      setShowCancelModal(false);
      router.push("/orders");
    } catch (e) { toast(e instanceof Error ? e.message : "Thử lại sau", "error"); }
    finally { setActing(false); }
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActing(true);
    try {
      await ordersApi.uploadDeliveryPhoto(id, file);
      toast("Đã tải ảnh giao hàng", "success");
    } catch { toast("Upload thất bại", "error"); }
    finally { setActing(false); }
  };

  const images        = order?.dorm_image_urls ?? [];
  const pickupNotes   = parseNotes(order?.pickup_notes);
  const deliveryNotes = parseNotes(order?.delivery_notes);
  const deliveryAddr  = order?.delivery_address || order?.dropoff_address;
  const vehicleLabel  = order?.vehicle_size
    ? (VEHICLE_LABELS[order.vehicle_size] ?? order.vehicle_size)
    : null;
  const sc           = order ? getOrderStatusColor(order.status) : "#9CA3AF";

  /* ── Layout ── */
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors shrink-0">
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Chi tiết đơn hàng</h1>
          {order && <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : !order ? (
        <div className="text-center py-16 text-gray-400">Không tìm thấy đơn hàng</div>
      ) : (
        <div className="space-y-4">

          {/* Status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{ backgroundColor: sc + "18", color: sc }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sc }} />
              {getOrderStatusLabel(order.status)}
            </span>
            <span className="text-xs text-gray-400">{formatDate(order.created_at)}</span>
          </div>

          {/* Route card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50">
              <p className="text-sm font-bold text-gray-800">Lộ trình</p>
            </div>

            {/* Pickup */}
            <div className="flex items-start gap-3 px-5 py-4 bg-blue-50/60">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={14} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wide mb-1">Điểm lấy đồ</p>
                <p className="text-sm font-semibold text-gray-800 leading-snug">{order.pickup_address || "—"}</p>
                {(pickupNotes.length > 0 || order.pickup_floor || order.pickup_has_elevator !== undefined) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {order.pickup_floor && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium">
                        Tầng {order.pickup_floor}
                      </span>
                    )}
                    {order.pickup_has_elevator === true && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium">
                        Có thang máy
                      </span>
                    )}
                    {order.pickup_has_elevator === false && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-medium">
                        Không thang máy
                      </span>
                    )}
                    {pickupNotes.map((n, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium">
                        {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 border-y border-gray-100">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="flex items-center gap-1 text-xs text-gray-400"><ArrowRight size={11} /> Chuyển đến</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Delivery */}
            <div className="flex items-start gap-3 px-5 py-4 bg-amber-50/60">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <Home size={14} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wide mb-1">Điểm giao đồ</p>
                <p className="text-sm font-semibold text-gray-800 leading-snug">{deliveryAddr || "—"}</p>
                {(deliveryNotes.length > 0 || order.delivery_floor || order.delivery_has_elevator !== undefined) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {order.delivery_floor && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium">
                        Tầng {order.delivery_floor}
                      </span>
                    )}
                    {order.delivery_has_elevator === true && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium">
                        Có thang máy
                      </span>
                    )}
                    {order.delivery_has_elevator === false && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-medium">
                        Không thang máy
                      </span>
                    )}
                    {deliveryNotes.map((n, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium">
                        {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Summary chips */}
            {(order.requires_helpers || vehicleLabel) && (
              <div className="flex flex-wrap gap-2 px-5 py-3.5 border-t border-gray-50">
                {order.requires_helpers && (
                  <Chip icon={<Users size={11} />}
                    label={order.number_of_helpers ? `${order.number_of_helpers} nhân công` : "Cần nhân công"}
                    color="purple" />
                )}
                {vehicleLabel && (
                  <Chip icon={<Truck size={11} />} label={vehicleLabel} />
                )}
              </div>
            )}
          </div>

          {/* Image gallery */}
          {images.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon size={14} className="text-gray-400" />
                <p className="text-sm font-bold text-gray-800">Ảnh đồ đạc <span className="text-gray-400 font-normal">({images.length} tấm)</span></p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {images.map((url, i) => (
                  <button key={i} onClick={() => setLightboxIdx(i)}
                    className="aspect-square rounded-xl overflow-hidden border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all group">
                    <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer */}
          {order.customer && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <p className="text-sm font-bold text-gray-800 mb-3">Khách hàng</p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                    {order.customer.full_name?.[0] ?? "K"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{order.customer.full_name}</p>
                    <p className="text-xs text-gray-400">{order.customer.phone}</p>
                  </div>
                </div>
                <a href={`tel:${order.customer.phone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                  <Phone size={12} /> Gọi
                </a>
              </div>
            </div>
          )}

          {/* ── Actions per status ── */}

          {/* Báo giá */}
          {order.status === "pending" && order.quote_request && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 space-y-3">
              <p className="text-sm font-bold text-gray-800">Gửi báo giá</p>
              <div className="relative">
                <input
                  type="text" inputMode="numeric"
                  placeholder="Giá báo (VNĐ)"
                  value={price}
                  onChange={e => setPrice(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">₫</span>
              </div>
              {price && parseInt(price) > 0 && (
                <p className="text-xs text-blue-600 font-semibold">= {formatVND(parseInt(price))}</p>
              )}
              <input
                placeholder="Ghi chú (tùy chọn)"
                value={quoteNote}
                onChange={e => setQuoteNote(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
              />
              <Button className="w-full gap-2" loading={acting} onClick={submitQuote}>
                <Send size={14} /> Gửi báo giá
              </Button>
            </div>
          )}

          {/* Phản hồi đơn thường (không báo giá) */}
          {order.status === "pending" && !order.quote_request && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <p className="text-sm font-bold text-gray-800 mb-3">Phản hồi đơn</p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" loading={acting} onClick={() => respond("reject")}>
                  Bỏ qua
                </Button>
                <Button loading={acting} onClick={() => respond("accept")}>
                  <CheckCircle size={15} /> Nhận đơn
                </Button>
              </div>
            </div>
          )}

          {/* Chờ khách đặt cọc */}
          {order.status === "matched" && !order.deposit_paid && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Khách đã chọn báo giá của bạn</p>
                <p className="text-sm text-amber-600 mt-0.5">Đang chờ khách thanh toán đặt cọc…</p>
                <p className="text-xs text-gray-400 mt-1.5">Sau khi đặt cọc thành công, đơn sẽ tự động chuyển sang trạng thái sẵn sàng.</p>
              </div>
            </div>
          )}

          {/* Đã đặt cọc — tự động chuyển accepted, hiển thị thông báo */}
          {order.status === "matched" && order.deposit_paid && (
            <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-3.5 flex items-center gap-3">
              <Wallet size={18} className="text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-800">Đặt cọc thành công — đơn đang được xử lý</p>
                <p className="text-xs text-green-600">Trang sẽ tự cập nhật trong giây lát…</p>
              </div>
            </div>
          )}

          {/* Đã nhận — bắt đầu */}
          {order.status === "accepted" && (
            <div className="space-y-3">
              <Button className="w-full gap-2" loading={acting} onClick={() => lifecycle("start")}>
                <Truck size={15} /> Đang đến lấy hàng
              </Button>
              <Link href={`/tai-xe/tin-nhan?orderId=${order.id}`} className="block">
                <Button variant="outline" className="w-full gap-2">
                  <MessageSquare size={15} /> Chat với khách hàng
                </Button>
              </Link>
              <Button variant="destructive" className="w-full gap-2" onClick={() => setShowCancelModal(true)}>
                <XCircle size={15} /> Hủy đơn
              </Button>
            </div>
          )}

          {/* Đang đến lấy */}
          {order.status === "picking_up" && (
            <div className="space-y-3">
              <Button className="w-full gap-2" loading={acting} onClick={() => lifecycle("start")}>
                <Truck size={15} /> Đang vận chuyển
              </Button>
              <Link href={`/tai-xe/tin-nhan?orderId=${order.id}`} className="block">
                <Button variant="outline" className="w-full gap-2">
                  <MessageSquare size={15} /> Chat với khách hàng
                </Button>
              </Link>
              <Button variant="destructive" className="w-full gap-2" onClick={() => setShowCancelModal(true)}>
                <XCircle size={15} /> Hủy đơn
              </Button>
            </div>
          )}

          {/* Đang vận chuyển */}
          {order.status === "in_progress" && (
            <div className="space-y-3">
              <input type="file" accept="image/*" id="delivery-photo" className="hidden" onChange={uploadPhoto} />
              <Button variant="outline" className="w-full gap-2"
                onClick={() => document.getElementById("delivery-photo")?.click()}>
                <Camera size={15} /> Ảnh giao hàng
              </Button>
              <Button className="w-full gap-2" loading={acting} onClick={() => lifecycle("complete")}>
                <CheckCircle size={15} /> Hoàn thành đơn
              </Button>
              <Link href={`/tai-xe/tin-nhan?orderId=${order.id}`} className="block">
                <Button variant="outline" className="w-full gap-2">
                  <MessageSquare size={15} /> Chat với khách hàng
                </Button>
              </Link>
              <Button variant="destructive" className="w-full gap-2" onClick={() => setShowCancelModal(true)}>
                <XCircle size={15} /> Hủy đơn
              </Button>
            </div>
          )}

        </div>
      )}

      {/* ── Cancel modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Hủy đơn hàng?</h3>
                <p className="text-xs text-red-500 mt-0.5">Điểm tuân thủ sẽ bị trừ 2 điểm</p>
              </div>
              <button onClick={() => { setShowCancelModal(false); setCancelReason(""); }}
                className="ml-auto w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <X size={13} />
              </button>
            </div>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Lý do hủy đơn (bắt buộc)..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => { setShowCancelModal(false); setCancelReason(""); }}>
                Quay lại
              </Button>
              <Button variant="destructive" loading={acting} onClick={cancelOrder}>
                Xác nhận hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}>
          <button onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X size={18} />
          </button>
          <img src={images[lightboxIdx]} alt=""
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()} />
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setLightboxIdx(i); }}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{ backgroundColor: i === lightboxIdx ? "#fff" : "rgba(255,255,255,0.3)" }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ icon, label, color = "gray" }: { icon: React.ReactNode; label: string; color?: "gray" | "purple" }) {
  const styles = {
    gray:   { bg: "#F3F4F6", text: "#374151" },
    purple: { bg: "#F5F3FF", text: "#6D28D9" },
  }[color];
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: styles.bg, color: styles.text }}>
      {icon}{label}
    </span>
  );
}
