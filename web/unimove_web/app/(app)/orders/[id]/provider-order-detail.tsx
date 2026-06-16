"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  Truck,
  Camera,
  ClipboardList,
  Wallet,
  PackageCheck,
  Flag,
  MessageCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteRequestSection } from "@/components/provider/QuoteRequestSection";
import { ordersApi } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { formatVND, formatDate, cn } from "@/lib/utils";
import {
  isAwaitingDeposit,
  isOpenQuoteRequest,
  isReadyToAccept,
} from "@/lib/provider-order";
import { useToast } from "@/components/ui/toast";

const NAVY = "#0F1E3D";
const BLUE = "#2563EB";

interface OrderDetail {
  id: string;
  status: string;
  quote_request?: boolean;
  service_type?: string;
  vehicle_size?: string;
  pickup_address: string;
  dropoff_address?: string;
  delivery_address?: string;
  pickup_notes?: string;
  delivery_notes?: string;
  pickup_floor?: number;
  delivery_floor?: number;
  pickup_has_elevator?: boolean;
  delivery_has_elevator?: boolean;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  floor_number?: number;
  num_helpers?: number;
  number_of_helpers?: number;
  requires_helpers?: boolean;
  description?: string;
  special_notes?: string;
  base_price?: number;
  distance_price?: number;
  floor_price?: number;
  service_fee?: number;
  estimated_price?: number;
  total_price?: number;
  provider_id?: string | null;
  deposit_paid?: boolean;
  deposit_amount?: number;
  deposit_paid_at?: string;
  scheduled_pickup_time?: string;
  actual_pickup_time?: string;
  completed_at?: string;
  created_at: string;
  delivery_photo_url?: string | null;
  customer?: { id: string; full_name: string; phone: string; avatar_url?: string };
}

const PROGRESS_STEPS = [
  { key: "created", label: "Tạo đơn", icon: ClipboardList },
  { key: "deposit", label: "Khách đã cọc", icon: Wallet },
  { key: "delivering", label: "Đang giao", icon: Truck },
  { key: "received", label: "Đã nhận hàng", icon: PackageCheck },
] as const;

function parseQuoteRef(notes?: string): string | null {
  if (!notes) return null;
  const m = notes.match(/Mã báo giá:\s*(\S+)/);
  return m?.[1] ?? null;
}

function parseAlley(notes?: string): string | null {
  if (!notes) return null;
  const m = notes.match(/Hẻm:\s*([^·]+)/);
  return m?.[1]?.trim() ?? null;
}

function shortPlace(addr: string) {
  const part = addr.split(",")[0]?.trim();
  return part && part.length < addr.length ? part : addr.slice(0, 56);
}

function floorMeta(floor?: number, hasElevator?: boolean, fallbackFloor?: number) {
  const f = floor ?? fallbackFloor;
  const parts: string[] = [];
  if (f != null) parts.push(`Tầng ${f}`);
  if (hasElevator != null) parts.push(hasElevator ? "Thang máy" : "Không thang máy");
  return parts.join(" · ") || "Nhà mặt tiền";
}

function providerProgressIndex(order: OrderDetail): number {
  if (order.status === "completed") return 3;
  if (order.status === "in_progress" || order.status === "picking_up") return 2;
  if (order.status === "accepted") return 1;
  if (order.status === "matched") return order.deposit_paid ? 1 : 0;
  return 0;
}

function formatHistoryTime(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const time = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(d);
  if (isToday) return `Hôm nay, ${time}`;
  return formatDate(dateStr);
}

function buildHistory(order: OrderDetail) {
  const items: { title: string; time: string; highlight?: boolean }[] = [];

  if (order.completed_at) {
    items.push({ title: "Đã nhận hàng", time: order.completed_at, highlight: true });
  }
  if (order.actual_pickup_time) {
    items.push({ title: "Bắt đầu chuyến giao", time: order.actual_pickup_time, highlight: true });
  }
  if (order.status === "accepted" || order.status === "in_progress" || order.status === "picking_up") {
    items.push({ title: "Nhà xe đã nhận đơn", time: order.deposit_paid_at || order.created_at });
  }
  if (order.deposit_paid) {
    items.push({
      title: "Đã cọc thành công",
      time: order.deposit_paid_at || order.created_at,
      highlight: true,
    });
  }
  items.push({ title: "Tạo yêu cầu vận chuyển", time: order.created_at });

  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

function serviceTypeLabel(type?: string) {
  if (!type) return "Standard";
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
}

function vehicleLabel(size?: string) {
  if (!size) return null;
  const map: Record<string, string> = {
    small: "Small Truck",
    medium: "Medium Truck",
    large: "Large Truck",
  };
  return map[size] ?? size.replace(/_/g, " ");
}

export default function ProviderOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [deliveryPhotoPreview, setDeliveryPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = async () => {
    const r = await ordersApi.get(id);
    if (r.success && r.data) {
      const next = r.data as OrderDetail;
      setOrder(next);
      if (next.delivery_photo_url) {
        setDeliveryPhotoPreview(next.delivery_photo_url);
      }
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  const respond = async (action: "accept" | "reject") => {
    setActing(true);
    try {
      await ordersApi.respond(id, action);
      toast(action === "accept" ? "Đã chấp nhận" : "Đã từ chối", action === "accept" ? "success" : "info");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Thử lại sau", "error");
    } finally {
      setActing(false);
    }
  };

  const lifecycle = async (action: "accept" | "start" | "complete") => {
    if (action === "complete" && !hasDeliveryPhoto) {
      toast("Vui lòng tải ảnh giao hàng trước khi hoàn thành đơn", "error");
      return;
    }

    setActing(true);
    try {
      if (action === "accept") await ordersApi.accept(id);
      else if (action === "start") await ordersApi.start(id);
      else await ordersApi.complete(id);
      toast("Cập nhật trạng thái thành công", "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Lỗi", "error");
    } finally {
      setActing(false);
    }
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("Chỉ chấp nhận file ảnh", "error");
      e.target.value = "";
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setDeliveryPhotoPreview(localPreview);
    setUploadingPhoto(true);

    try {
      const res = await ordersApi.uploadDeliveryPhoto(id, file);
      const photoUrl =
        (res.data as { photo_url?: string } | undefined)?.photo_url ?? localPreview;
      setDeliveryPhotoPreview(photoUrl);
      setOrder((prev) => (prev ? { ...prev, delivery_photo_url: photoUrl } : prev));
      toast("Đã tải ảnh giao hàng thành công", "success");
      await load();
    } catch (err) {
      setDeliveryPhotoPreview(order?.delivery_photo_url ?? null);
      toast(err instanceof Error ? err.message : "Upload thất bại", "error");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const providerId = getStoredUser()?.id;
  const dropoff = order?.dropoff_address ?? order?.delivery_address ?? "";
  const openQuote = order ? isOpenQuoteRequest(order) : false;
  const awaitingDeposit = order ? isAwaitingDeposit(order, providerId) : false;
  const readyToAccept = order ? isReadyToAccept(order, providerId) : false;
  const isPendingNonQuote = order?.status === "pending" && !order?.quote_request;
  const progressIdx = order ? providerProgressIndex(order) : 0;
  const history = useMemo(() => (order ? buildHistory(order) : []), [order]);

  const customerName = order?.customer?.full_name || order?.pickup_contact_name || "Khách hàng";
  const customerPhone = order?.customer?.phone || order?.pickup_contact_phone || "";
  const quoteRef = parseQuoteRef(order?.pickup_notes) ?? parseQuoteRef(order?.delivery_notes);
  const pickupAlley = parseAlley(order?.pickup_notes);

  const basePrice = order?.base_price ?? order?.estimated_price ?? 0;
  const loadingFee = (order?.floor_price ?? 0) + (order?.service_fee ?? 0) + (order?.distance_price ?? 0);
  const totalPrice = order?.total_price ?? order?.estimated_price ?? basePrice + loadingFee;
  const showPricing = !openQuote && totalPrice > 0;
  const hasDeliveryPhoto = Boolean(order?.delivery_photo_url || deliveryPhotoPreview);

  return (
    <div className="min-h-screen bg-[#F4F6FA] pb-8">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 pt-4">
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/orders"
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50"
          >
            <ArrowLeft size={18} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900">Chi tiết đơn</h1>
            {order && (
              <p className="text-sm text-gray-400">
                Mã vận đơn: #{order.id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid lg:grid-cols-5 gap-4">
            <Skeleton className="h-72 lg:col-span-3 rounded-2xl" />
            <Skeleton className="h-72 lg:col-span-2 rounded-2xl" />
          </div>
        ) : !order ? (
          <div className="text-center py-16 text-gray-500">Không tìm thấy đơn hàng</div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-4 items-start">
            {/* ── Cột trái ── */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="p-5 rounded-2xl border-gray-100 shadow-sm">
                <div className="flex items-start justify-between relative">
                  <div
                    className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-gray-200"
                    style={{
                      background: `linear-gradient(to right, ${BLUE} ${(progressIdx / (PROGRESS_STEPS.length - 1)) * 100}%, #E5E7EB ${(progressIdx / (PROGRESS_STEPS.length - 1)) * 100}%)`,
                    }}
                  />
                  {PROGRESS_STEPS.map((step, i) => {
                    const done = i < progressIdx;
                    const active = i === progressIdx;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center z-10 flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                            done || active
                              ? "border-[#2563EB] bg-[#2563EB] text-white"
                              : "border-gray-200 bg-white text-gray-400",
                          )}
                        >
                          {done ? <CheckCircle size={18} /> : <Icon size={18} />}
                        </div>
                        <span
                          className={cn(
                            "text-[10px] sm:text-[11px] text-center mt-2 font-semibold leading-tight px-0.5",
                            done || active ? "text-[#2563EB]" : "text-gray-400",
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <div className="grid sm:grid-cols-2 gap-3">
                <LocationCard
                  title="Điểm Đón"
                  place={shortPlace(order.pickup_address)}
                  subtitle={floorMeta(order.pickup_floor, order.pickup_has_elevator, order.floor_number)}
                  footer={pickupAlley ? `Hẻm: ${pickupAlley}` : order.pickup_notes ? undefined : "Hẻm: Chưa rõ"}
                  icon={<MapPin size={16} className="text-emerald-600" />}
                  iconBg="bg-emerald-50"
                />
                <LocationCard
                  title="Điểm Đến"
                  place={shortPlace(dropoff)}
                  subtitle={floorMeta(order.delivery_floor, order.delivery_has_elevator)}
                  footer={quoteRef ? `Mã báo giá: ${quoteRef}` : order.delivery_notes || undefined}
                  icon={<Flag size={16} className="text-[#2563EB]" />}
                  iconBg="bg-blue-50"
                />
              </div>

              <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                <div className="relative h-44 sm:h-52 bg-[#1a2332]">
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_40%,#2563EB_0%,transparent_50%),radial-gradient(circle_at_70%_60%,#3B82F6_0%,transparent_40%)]" />
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <path
                      d="M 48 120 Q 140 50 240 90 T 400 60"
                      fill="none"
                      stroke="#60A5FA"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute top-[100px] left-[44px] w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white" />
                  <div className="absolute top-[52px] right-[56px] w-3 h-3 rounded-full bg-amber-400 ring-2 ring-white" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 shadow">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
                    Đang tính toán lộ trình tối ưu...
                  </div>
                </div>
              </Card>
            </div>

            {/* ── Cột phải ── */}
            <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-4">
              <Card className="p-5 rounded-2xl border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Người đặt đơn
                </p>
                <div className="flex items-center gap-3 mb-3">
                  {order.customer?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.customer.avatar_url}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ background: `linear-gradient(135deg, ${BLUE}, ${NAVY})` }}
                    >
                      {customerName[0]?.toUpperCase() ?? "K"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{customerName}</p>
                    {customerPhone && (
                      <p className="text-xs text-gray-500 truncate">{customerPhone}</p>
                    )}
                  </div>
                  {customerPhone && (
                    <a href={`tel:${customerPhone}`}>
                      <button
                        type="button"
                        className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                      >
                        <Phone size={18} />
                      </button>
                    </a>
                  )}
                </div>

                {customerPhone && (
                  <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 mb-3">
                    <p className="text-xs text-gray-400 mb-0.5">Số điện thoại</p>
                    <p className="text-sm font-semibold text-gray-800">{customerPhone}</p>
                  </div>
                )}

                {order.provider_id && order.status !== "cancelled" && (
                  <Link
                    href={`/orders/chat?orderId=${order.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 mb-3 rounded-xl bg-[#0F1E3D] text-white text-sm font-bold hover:bg-[#1a2d52] no-underline"
                  >
                    <MessageCircle size={16} /> Nhắn tin khách
                  </Link>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-[#2563EB] border border-blue-100">
                    {serviceTypeLabel(order.service_type)}
                  </span>
                  {vehicleLabel(order.vehicle_size) && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                      {vehicleLabel(order.vehicle_size)}
                    </span>
                  )}
                </div>

                {order.deposit_paid && order.deposit_amount != null && order.deposit_amount > 0 && (
                  <span className="inline-flex text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Cọc: {formatVND(order.deposit_amount)}
                  </span>
                )}
              </Card>

              {openQuote && (
                <QuoteRequestSection
                  orderId={id}
                  scheduledPickupTime={order.scheduled_pickup_time}
                  onSubmitted={load}
                />
              )}

              {(showPricing || readyToAccept || awaitingDeposit || isPendingNonQuote) && (
                <Card className="p-5 rounded-2xl border-gray-100 shadow-sm">
                  <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>
                    Tóm tắt dịch vụ
                  </h3>

                  {showPricing && (
                    <div className="space-y-2.5 text-sm mb-4">
                      <div className="flex justify-between text-gray-600">
                        <span>Giá cước cơ bản</span>
                        <span className="font-medium">{formatVND(basePrice)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Phí bốc xếp</span>
                        <span className="font-medium">{formatVND(loadingFee)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Mã giảm giá</span>
                        <span className="font-medium text-emerald-600">-0 đ</span>
                      </div>
                      <div className="border-t border-gray-100 pt-3 flex justify-between items-end">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Tổng giá dịch vụ
                        </span>
                        <div className="text-right">
                          <p className="text-xl font-extrabold text-[#2563EB]">{formatVND(totalPrice)}</p>
                          {order.deposit_paid && (
                            <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                              Khách đã đặt cọc
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {awaitingDeposit && (
                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 mb-3">
                      <p className="text-sm font-semibold text-amber-900">Chờ khách đặt cọc</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Khách đã chọn bạn. Sau khi đặt cọc, bạn có thể nhận đơn.
                      </p>
                    </div>
                  )}

                  {isPendingNonQuote && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Button variant="destructive" size="sm" loading={acting} onClick={() => respond("reject")}>
                        <XCircle size={14} /> Từ chối
                      </Button>
                      <Button size="sm" loading={acting} onClick={() => respond("accept")}>
                        <CheckCircle size={14} /> Nhận đơn
                      </Button>
                    </div>
                  )}

                  {readyToAccept && (
                    <Button
                      className="w-full h-12 gap-2 rounded-xl text-sm font-bold bg-[#2563EB] hover:bg-blue-700"
                      loading={acting}
                      onClick={() => respond("accept")}
                    >
                      <Truck size={18} /> Nhận đơn — bắt đầu chuẩn bị
                    </Button>
                  )}

                  {order.status === "accepted" && (
                    <Button
                      className="w-full h-12 gap-2 rounded-xl text-sm font-bold"
                      loading={acting}
                      onClick={() => lifecycle("start")}
                    >
                      <Truck size={18} /> Bắt đầu chuyến
                    </Button>
                  )}

                  {order.status === "in_progress" && (
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        id="delivery-photo"
                        className="hidden"
                        onChange={uploadPhoto}
                      />

                      {deliveryPhotoPreview ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-100">
                            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                              Ảnh giao hàng
                            </p>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Đã tải lên
                            </span>
                          </div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={deliveryPhotoPreview}
                            alt="Ảnh giao hàng"
                            className="w-full h-44 object-cover bg-gray-100"
                          />
                          <div className="px-3 py-2 flex justify-end">
                            <button
                              type="button"
                              className="text-xs font-semibold text-[#2563EB] hover:underline"
                              onClick={() => document.getElementById("delivery-photo")?.click()}
                              disabled={uploadingPhoto}
                            >
                              {uploadingPhoto ? "Đang tải..." : "Chụp / chọn ảnh khác"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                          <Camera size={28} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-sm font-semibold text-gray-700">
                            Chụp ảnh hoàn thành giao hàng
                          </p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            Bắt buộc trước khi bấm hoàn thành đơn — ảnh sẽ hiển thị tại đây sau khi tải lên.
                          </p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full gap-2 rounded-xl"
                        loading={uploadingPhoto}
                        onClick={() => document.getElementById("delivery-photo")?.click()}
                      >
                        <Camera size={16} />
                        {hasDeliveryPhoto ? "Đổi ảnh giao hàng" : "Tải ảnh giao hàng"}
                      </Button>

                      <Button
                        className="w-full h-12 gap-2 rounded-xl font-bold"
                        loading={acting}
                        disabled={!hasDeliveryPhoto || uploadingPhoto}
                        onClick={() => lifecycle("complete")}
                      >
                        <CheckCircle size={16} /> Hoàn thành đơn
                      </Button>

                      {!hasDeliveryPhoto && (
                        <p className="text-[11px] text-amber-700 text-center leading-relaxed bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                          Bạn cần tải ảnh xác nhận giao hàng trước khi hoàn thành đơn.
                        </p>
                      )}
                    </div>
                  )}

                  {(readyToAccept || isPendingNonQuote) && (
                    <p className="text-[11px] text-gray-400 text-center mt-3 leading-relaxed">
                      Bằng việc nhận đơn, bạn đồng ý với điều khoản vận chuyển của UniMove.
                    </p>
                  )}
                </Card>
              )}

              <Card className="p-5 rounded-2xl border-gray-100 shadow-sm">
                <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>
                  Lịch sử đơn hàng
                </h3>
                <div className="space-y-4">
                  {history.map((item, i) => (
                    <div key={`${item.title}-${item.time}`} className="flex gap-3 relative">
                      {i < history.length - 1 && (
                        <div className="absolute left-[5px] top-4 bottom-[-12px] w-px bg-gray-200" />
                      )}
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 z-10",
                          item.highlight ? "bg-[#2563EB]" : "bg-gray-300",
                        )}
                      />
                      <div className="min-w-0 pb-1">
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatHistoryTime(item.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LocationCard({
  title,
  place,
  subtitle,
  footer,
  icon,
  iconBg,
}: {
  title: string;
  place: string;
  subtitle: string;
  footer?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <Card className="p-4 rounded-2xl border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconBg)}>{icon}</div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
      <p className="text-sm font-bold text-gray-900 leading-snug">{place}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      {footer && (
        <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100">{footer}</p>
      )}
    </Card>
  );
}
