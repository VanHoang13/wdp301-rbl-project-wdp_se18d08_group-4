"use client";

import React, { useEffect, useState } from "react";
import { Bell, Package, AlertCircle, CheckCircle, Star, ChevronRight } from "lucide-react";

interface Notification {
  id: string;
  type: "order" | "promo" | "system" | "review";
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

const MOCK: Notification[] = [
  { id: "1", type: "order", title: "Đơn hàng đã xác nhận", body: "Tài xế Nguyễn Văn A đã nhận đơn #ABC123 của bạn.", read: false, created_at: "2025-06-15T09:00:00Z" },
  { id: "2", type: "promo", title: "Ưu đãi đặc biệt hôm nay!", body: "Giảm 20% cho chuyến đầu tiên trong tuần. Hạn dùng: hôm nay.", read: false, created_at: "2025-06-15T08:00:00Z" },
  { id: "3", type: "order", title: "Đơn hàng hoàn thành", body: "Chuyến #XYZ789 đã giao thành công. Cảm ơn bạn đã sử dụng dịch vụ!", read: true, created_at: "2025-06-14T15:00:00Z" },
  { id: "4", type: "system", title: "Cập nhật ứng dụng", body: "Phiên bản mới đã sẵn sàng với nhiều cải tiến về hiệu suất.", read: true, created_at: "2025-06-13T10:00:00Z" },
  { id: "5", type: "review", title: "Đánh giá chuyến đi", body: "Hãy để lại đánh giá cho chuyến #DEF456 để giúp cải thiện dịch vụ.", read: true, created_at: "2025-06-12T12:00:00Z" },
];

const TYPE_META: Record<Notification["type"], { icon: React.ElementType; bg: string; color: string }> = {
  order:  { icon: Package,      bg: "#EFF6FF", color: "#2563EB" },
  promo:  { icon: Star,         bg: "#FFFBEB", color: "#D97706" },
  system: { icon: AlertCircle,  bg: "#F0FDF4", color: "#16A34A" },
  review: { icon: CheckCircle,  bg: "#FFF1F2", color: "#E11D48" },
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
  const [items, setItems] = useState<Notification[]>(MOCK);
  const unread = items.filter(i => !i.read).length;

  const markAll = () => setItems(prev => prev.map(i => ({ ...i, read: true })));
  const markOne = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));

  return (
    <div className="px-4 pb-6 pt-5 max-w-2xl mx-auto lg:max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thông báo</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unread > 0 ? `${unread} thông báo chưa đọc` : "Tất cả đã đọc"}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAll}
            className="px-4 py-1.5 rounded-full text-sm font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            Đọc tất cả
          </button>
        )}
      </div>

      {/* List */}
      {items.length === 0 ? (
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
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            return (
              <button
                key={item.id}
                onClick={() => markOne(item.id)}
                className="w-full flex items-start gap-3.5 px-4 py-4 text-left transition-colors hover:bg-gray-50/60"
                style={{ backgroundColor: item.read ? undefined : "#EFF6FF08" }}
              >
                {/* Icon */}
                <div className="shrink-0 mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: meta.bg }}>
                  <Icon size={18} style={{ color: meta.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${item.read ? "font-medium text-gray-800" : "font-bold text-gray-900"}`}>
                      {item.title}
                    </p>
                    {!item.read && (
                      <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-[#2563EB]" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgoLocal(item.created_at)}</p>
                </div>

                <ChevronRight size={16} className="shrink-0 text-gray-300 mt-2" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}