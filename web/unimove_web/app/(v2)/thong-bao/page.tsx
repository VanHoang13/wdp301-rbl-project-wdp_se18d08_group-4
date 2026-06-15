"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Package, AlertCircle, CheckCircle, Star, ChevronRight } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  message?: string;
  read: boolean;
  is_read?: boolean;
  created_at: string;
  action_data?: { order_id?: string; listing_id?: string };
}

function mapType(t: string): "order" | "promo" | "system" | "review" {
  if (t?.includes("order") || t?.includes("quote")) return "order";
  if (t?.includes("review")) return "review";
  if (t?.includes("promo")) return "promo";
  return "system";
}

const TYPE_META = {
  order:  { icon: Package,     bg: "#EFF6FF", color: "#2563EB" },
  promo:  { icon: Star,        bg: "#FFFBEB", color: "#D97706" },
  system: { icon: AlertCircle, bg: "#F0FDF4", color: "#16A34A" },
  review: { icon: CheckCircle, bg: "#FFF1F2", color: "#E11D48" },
};

function timeAgoLocal(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

export default function ThongBaoPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list({ pageSize: 50 });
      const raw = (res.data as { notifications?: Notification[] })?.notifications ?? [];
      setItems(raw.map((n) => ({
        ...n,
        title: n.title || "Thông báo",
        body: n.body || n.message || "",
        read: n.read ?? n.is_read ?? false,
      })));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unread = items.filter((i) => !i.read).length;

  const markAll = async () => {
    await notificationsApi.markAllRead();
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  const markOne = async (id: string) => {
    await notificationsApi.markRead(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  };

  const hrefFor = (item: Notification) => {
    if (item.action_data?.order_id) return `/don-hang/${item.action_data.order_id}`;
    if (item.action_data?.listing_id) return `/cho-sinh-vien/${item.action_data.listing_id}`;
    return undefined;
  };

  return (
    <div className="px-4 pb-6 pt-5 max-w-2xl mx-auto lg:max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unread > 0 ? `${unread} thông báo chưa đọc` : "Tất cả đã đọc"}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="px-4 py-1.5 rounded-full text-sm font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100">
            Đọc tất cả
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Bell size={32} className="text-[#2563EB]" />
          </div>
          <p className="font-bold text-gray-900 mb-1">Chưa có thông báo</p>
          <p className="text-sm text-gray-500">Chúng tôi sẽ thông báo khi có cập nhật mới</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {items.map((item) => {
            const type = mapType(item.type);
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            const href = hrefFor(item);
            const inner = (
              <button
                onClick={() => markOne(item.id)}
                className="w-full flex items-start gap-3.5 px-4 py-4 text-left transition-colors hover:bg-gray-50/60"
                style={{ backgroundColor: item.read ? undefined : "#EFF6FF08" }}
              >
                <div className="shrink-0 mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
                  <Icon size={18} style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${item.read ? "font-medium text-gray-800" : "font-bold text-gray-900"}`}>{item.title}</p>
                    {!item.read && <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-[#2563EB]" />}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgoLocal(item.created_at)}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-gray-300 mt-2" />
              </button>
            );
            return href ? <Link key={item.id} href={href}>{inner}</Link> : <div key={item.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}
