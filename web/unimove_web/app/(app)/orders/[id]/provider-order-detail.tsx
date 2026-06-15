"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, Phone, CheckCircle, XCircle, DollarSign, Truck, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi, quotesApi } from "@/lib/api";
import { getOrderStatusLabel, getOrderStatusColor, formatVND, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface OrderDetail {
  id: string; status: string; quote_request?: boolean;
  pickup_address: string; dropoff_address: string; description?: string;
  floor_number?: number; num_helpers?: number; special_notes?: string;
  estimated_price?: number; created_at: string;
  customer?: { id: string; full_name: string; phone: string };
}

export default function ProviderOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    const r = await ordersApi.get(id);
    if (r.success && r.data) setOrder(r.data as OrderDetail);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  const submitQuote = async () => {
    const base = parseInt(price, 10);
    if (!base || base <= 0) { toast("Nhập giá báo hợp lệ", "error"); return; }
    setActing(true);
    try {
      await quotesApi.submit(id, { base_price: base, schedule_fit: "exact_match", note: note || undefined });
      toast("Đã gửi báo giá", "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gửi báo giá thất bại", "error");
    } finally {
      setActing(false);
    }
  };

  const respond = async (action: "accept" | "reject") => {
    setActing(true);
    try {
      await ordersApi.respond(id, action, action === "accept" && price ? parseInt(price) : undefined);
      toast(action === "accept" ? "Đã chấp nhận" : "Đã từ chối", action === "accept" ? "success" : "info");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Thử lại sau", "error");
    } finally {
      setActing(false);
    }
  };

  const lifecycle = async (action: "accept" | "start" | "complete") => {
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
    setActing(true);
    try {
      await ordersApi.uploadDeliveryPhoto(id, file);
      toast("Đã tải ảnh giao hàng", "success");
    } catch {
      toast("Upload thất bại", "error");
    } finally {
      setActing(false);
    }
  };

  const sc = order ? getOrderStatusColor(order.status) : "var(--muted)";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <div className="px-4 pt-12 pb-4" style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <Link href="/orders" className="p-2 rounded-xl" style={{ backgroundColor: "var(--surface)" }}><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-lg font-bold">Chi tiết đơn hàng</h1>
            {order && <p className="text-xs text-gray-500">#{order.id.slice(0, 8).toUpperCase()}</p>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-4 space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : !order ? (
        <div className="text-center py-16 text-gray-500">Không tìm thấy</div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          <Card className="p-5 flex justify-between items-center">
            <Badge style={{ backgroundColor: sc + "22", color: sc }}>{getOrderStatusLabel(order.status)}</Badge>
            <span className="text-xs text-gray-500">{formatDate(order.created_at)}</span>
          </Card>

          {order.customer && (
            <Card className="p-5">
              <h3 className="font-bold mb-2">Khách hàng</h3>
              <p className="font-semibold">{order.customer.full_name}</p>
              <p className="text-sm text-gray-500">{order.customer.phone}</p>
              <a href={`tel:${order.customer.phone}`}><Button variant="outline" className="w-full mt-3 gap-2"><Phone size={16} /> Gọi khách</Button></a>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-bold mb-3">Lộ trình</h3>
            <p className="text-sm mb-2"><MapPin size={14} className="inline mr-1" />{order.pickup_address}</p>
            <p className="text-sm"><MapPin size={14} className="inline mr-1 text-green-600" />{order.dropoff_address}</p>
            {order.description && <p className="text-sm text-gray-500 mt-2">{order.description}</p>}
          </Card>

          {order.status === "pending" && order.quote_request && (
            <Card className="p-5">
              <h3 className="font-bold mb-3">Gửi báo giá</h3>
              <input type="number" placeholder="Giá báo (VNĐ)" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full h-11 rounded-xl border px-3 mb-2 text-sm" />
              <input placeholder="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} className="w-full h-11 rounded-xl border px-3 mb-3 text-sm" />
              <Button className="w-full gap-2" loading={acting} onClick={submitQuote}><DollarSign size={16} /> Gửi báo giá</Button>
            </Card>
          )}

          {order.status === "pending" && !order.quote_request && (
            <Card className="p-5">
              <h3 className="font-bold mb-3">Phản hồi đơn</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="destructive" loading={acting} onClick={() => respond("reject")}><XCircle size={16} /> Từ chối</Button>
                <Button loading={acting} onClick={() => respond("accept")}><CheckCircle size={16} /> Nhận đơn</Button>
              </div>
            </Card>
          )}

          {order.status === "accepted" && (
            <Button className="w-full gap-2" loading={acting} onClick={() => lifecycle("start")}><Truck size={16} /> Bắt đầu chuyến</Button>
          )}
          {order.status === "in_progress" && (
            <>
              <input type="file" accept="image/*" id="delivery-photo" className="hidden" onChange={uploadPhoto} />
              <Button variant="outline" className="w-full gap-2" onClick={() => document.getElementById("delivery-photo")?.click()}>
                <Camera size={16} /> Ảnh giao hàng
              </Button>
              <Button className="w-full gap-2 mt-2" loading={acting} onClick={() => lifecycle("complete")}><CheckCircle size={16} /> Hoàn thành</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
