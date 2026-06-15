"use client";

import React, { useEffect, useState } from "react";
import { CheckCheck, Bell, Package, Info, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationsApi } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface Notif {
  id: string; title: string; body: string;
  type: string; is_read: boolean; created_at: string;
}

const GREEN = "#16A34A";

const TYPE_META: Record<string, { bg: string; color: string }> = {
  order:   { bg: "#F0FDF4",  color: GREEN },
  default: { bg: "#EFF6FF",  color: "#2563EB" },
};

export default function ProviderMessagesPage() {
  const { toast }  = useToast();
  const [notifs,   setNotifs]  = useState<Notif[]>([]);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    notificationsApi.list({ pageSize: 50 }).then(r => {
      if (r.success && r.data) {
        const d = r.data as { notifications?: Notif[] } | Notif[];
        setNotifs(Array.isArray(d) ? d : (d?.notifications ?? []));
      }
    }).finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAll = async () => {
    await notificationsApi.markAllRead();
    setNotifs(p => p.map(n => ({ ...n, is_read: true })));
    toast("Đã đọc tất cả", "success");
  };

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div className="w-full space-y-5">
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            style={{ backgroundColor: "#F0FDF4", color: GREEN }}
          >
            <CheckCheck size={15} /> Đọc tất cả
          </button>
        )}
      </div>

      {/* List */}
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
        {loading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Bell size={32} className="text-gray-300" />
            </div>
            <p className="font-bold text-gray-900 mb-1">Chưa có thông báo</p>
            <p className="text-sm text-gray-400">Thông báo mới sẽ xuất hiện ở đây</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifs.map(n => {
              const meta = TYPE_META[n.type] ?? TYPE_META.default;
              return (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className="w-full flex gap-3.5 px-5 py-4 text-left transition-colors hover:bg-gray-50/60"
                  style={{ backgroundColor: n.is_read ? undefined : "#F0FDF408" }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: meta.bg }}
                  >
                    {n.type === "order"
                      ? <Package size={17} style={{ color: meta.color }} />
                      : <Info size={17} style={{ color: meta.color }} />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${n.is_read ? "font-medium text-gray-800" : "font-bold text-gray-900"}`}>
                        {n.title}
                      </p>
                      <span className="text-xs text-gray-400 shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read
                    ? <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: GREEN }} />
                    : <ChevronRight size={15} className="text-gray-200 shrink-0 mt-2" />
                  }
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}