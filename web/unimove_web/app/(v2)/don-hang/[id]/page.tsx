"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Star, CheckCircle, Truck, Clock, ChevronRight, XCircle, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi, quotesApi, paymentsApi } from "@/lib/api";
import { getOrderStatusLabel, getOrderStatusColor, formatVND, formatDate } from "@/lib/utils";
import { useUIStore } from "@/lib/stores";
import { getStoredUser } from "@/lib/auth";

interface OrderDetail {
  id: string; status: string; service_type: string; quote_request?: boolean;
  pickup_address: string; dropoff_address: string; description?: string;
  estimated_price?: number; final_price?: number; total_price?: number;
  deposit_amount?: number; deposit_paid?: boolean; created_at: string;
  provider?: { id: string; full_name: string; phone: string; rating: number; vehicle_type?: string };
  provider_name?: string;
}

interface Quote {
  id: string; provider_id: string; total_price: number; base_price: number;
  note?: string; provider_name?: string; status: string;
}

const STEPS = [
  { key: "pending", label: "Chờ xác nhận", icon: Clock },
  { key: "accepted", label: "Đã chấp nhận", icon: CheckCircle },
  { key: "picking_up", label: "Đang đến đón", icon: Truck },
  { key: "in_progress", label: "Đang vận chuyển", icon: Truck },
  { key: "completed", label: "Hoàn thành", icon: CheckCircle },
];

export default function DonHangDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useUIStore();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    const r = await ordersApi.get(id);
    if (r.success && r.data) setOrder(r.data as OrderDetail);
    if ((r.data as OrderDetail)?.quote_request) {
      const q = await quotesApi.list(id);
      const qd = q.data as { quotes?: Quote[] };
      setQuotes(qd?.quotes ?? (Array.isArray(q.data) ? q.data as Quote[] : []));
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

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
      showSuccess("Đã chọn báo giá");
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
    } catch (e) {
      showError(e instanceof Error ? e.message : "Thanh toán thất bại");
    } finally {
      setActing(false);
    }
  };

  const sc = order ? getOrderStatusColor(order.status) : "var(--muted)";
  const stepIdx = order ? STEPS.findIndex((s) => s.key === order.status) : -1;

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 pb-4 flex items-center gap-3">
        <Link href="/don-hang" className="p-2 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <ArrowLeft size={20} style={{ color: "var(--text)" }} />
        </Link>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>Chi tiết đơn hàng</h1>
          {order && <p className="text-xs" style={{ color: "var(--muted)" }}>#{order.id.slice(0, 8).toUpperCase()}</p>}
        </div>
      </div>

      {loading ? (
        <div className="px-4 space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : !order ? (
        <div className="text-center py-16"><p style={{ color: "var(--muted)" }}>Không tìm thấy đơn hàng</p></div>
      ) : (
        <div className="px-4 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <Badge style={{ backgroundColor: sc + "22", color: sc, border: `1px solid ${sc}44` }}>{getOrderStatusLabel(order.status)}</Badge>
              <span className="text-xs" style={{ color: "var(--muted)" }}>{formatDate(order.created_at)}</span>
            </div>
            {order.status !== "cancelled" && (
              <div className="flex items-center justify-between relative">
                <div className="absolute top-4 left-0 right-0 h-0.5" style={{ backgroundColor: "var(--border)" }} />
                {STEPS.map((step, i) => {
                  const done = i <= stepIdx;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center z-10">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center border-2" style={{ backgroundColor: done ? "var(--primary)" : "var(--surface)", borderColor: done ? "var(--primary)" : "var(--border)" }}>
                        <Icon size={14} style={{ color: done ? "white" : "var(--muted)" }} />
                      </div>
                      <span className="text-[9px] text-center mt-1 w-14" style={{ color: done ? "var(--primary)" : "var(--muted)" }}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {order.quote_request && quotes.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold mb-3" style={{ color: "var(--text)" }}>Báo giá từ nhà xe</h3>
              <div className="space-y-2">
                {quotes.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
                    <div>
                      <p className="font-semibold text-sm">{q.provider_name ?? "Nhà xe"}</p>
                      <p className="text-lg font-bold" style={{ color: "var(--primary)" }}>{formatVND(q.total_price)}</p>
                      {q.note && <p className="text-xs" style={{ color: "var(--muted)" }}>{q.note}</p>}
                    </div>
                    {order.status === "pending" && !order.provider && (
                      <Button size="sm" loading={acting} onClick={() => selectQuote(q.id)}>Chọn</Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-bold mb-4" style={{ color: "var(--text)" }}>Lộ trình</h3>
            <div className="space-y-3">
              <div className="flex gap-3"><MapPin size={16} className="mt-1" /><p className="text-sm">{order.pickup_address}</p></div>
              <div className="flex gap-3"><MapPin size={16} className="mt-1 text-green-600" /><p className="text-sm">{order.dropoff_address}</p></div>
            </div>
          </Card>

          {(order.estimated_price || order.final_price || order.total_price) && (
            <Card className="p-5">
              <h3 className="font-bold mb-3">Thanh toán</h3>
              <div className="flex justify-between"><span>Giá</span><span className="font-bold">{formatVND(order.final_price ?? order.total_price ?? order.estimated_price ?? 0)}</span></div>
              {order.deposit_amount && !order.deposit_paid && ["matched", "accepted", "pending"].includes(order.status) && (
                <Button className="w-full mt-3 gap-2" loading={acting} onClick={payDeposit}>
                  <CreditCard size={16} /> Đặt cọc {formatVND(order.deposit_amount)}
                </Button>
              )}
            </Card>
          )}

          {order.provider && (
            <Card className="p-5">
              <h3 className="font-bold mb-2">Nhà vận chuyển</h3>
              <p className="font-semibold">{order.provider.full_name ?? order.provider_name}</p>
              {order.provider.phone && (
                <a href={`tel:${order.provider.phone}`}><Button variant="outline" className="w-full mt-3 gap-2"><Phone size={16} /> Gọi nhà xe</Button></a>
              )}
            </Card>
          )}

          <div className="flex gap-2">
            <Link href={`/tin-nhan`} className="flex-1"><Button variant="outline" className="w-full">Nhắn tin</Button></Link>
            {["pending", "accepted", "matched"].includes(order.status) && (
              <Button variant="destructive" className="flex-1 gap-2" loading={acting} onClick={cancelOrder}><XCircle size={16} /> Hủy đơn</Button>
            )}
          </div>

          {order.status === "completed" && (
            <Link href={`/cho-sinh-vien`}>
              <Card className="p-4 flex items-center justify-between mt-2">
                <div className="flex items-center gap-2"><Star size={18} /><span className="font-semibold text-sm">Đánh giá trên chợ SV</span></div>
                <ChevronRight size={18} />
              </Card>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
