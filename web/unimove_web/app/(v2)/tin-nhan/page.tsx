"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Package, Star, AlertCircle, CheckCircle, MessageSquare } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/ui/glass-card";
import { OrderChatWorkspace } from "@/components/chat/OrderChatWorkspace";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  message?: string;
  read?: boolean;
  is_read?: boolean;
  created_at: string;
}

const TABS = ["Tin nhắn đơn", "Thông báo"] as const;

function mapType(t: string): "order" | "promo" | "system" | "review" {
  if (t?.includes("order") || t?.includes("quote")) return "order";
  if (t?.includes("review")) return "review";
  if (t?.includes("promo")) return "promo";
  return "system";
}

const TYPE_META = {
  order: { icon: Package, bg: "#EFF6FF", color: "#2563EB" },
  promo: { icon: Star, bg: "#FFFBEB", color: "#D97706" },
  system: { icon: AlertCircle, bg: "#F0FDF4", color: "#16A34A" },
  review: { icon: CheckCircle, bg: "#FFF1F2", color: "#E11D48" },
};

function TinNhanContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "thong-bao" ? 1 : 0;
  const orderIdParam = searchParams.get("orderId");
  const [tab, setTab] = useState(initialTab);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);

  React.useEffect(() => {
    setNotifLoading(true);
    notificationsApi
      .list({ pageSize: 50 })
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data as { notifications?: Notification[] } | Notification[];
          setNotifs(Array.isArray(d) ? d : (d?.notifications ?? []));
        }
      })
      .finally(() => setNotifLoading(false));
  }, []);

  return (
    <div className="px-4 pb-6 pt-5 max-w-[1400px] mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tin nhắn</h1>
          <p className="text-sm text-gray-500 mt-0.5">Chat đơn hàng & thông báo hệ thống</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 rounded-xl bg-gray-100 max-w-md">
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(i)}
            className="relative flex-1 py-2.5 text-sm font-medium rounded-lg"
          >
            {tab === i && (
              <motion.div
                layoutId="tin-nhan-tab"
                className="absolute inset-0 rounded-lg bg-white shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${tab === i ? "text-[#2563EB] font-semibold" : "text-gray-500"}`}>
              {label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 0 ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <OrderChatWorkspace initialOrderId={orderIdParam} />
          </motion.div>
        ) : (
          <motion.div
            key="notif"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2 max-w-2xl"
          >
            {notifLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : notifs.length === 0 ? (
              <GlassCard className="py-16 text-center">
                <Bell size={32} className="text-[#2563EB] mx-auto mb-3" />
                <p className="font-bold text-gray-900">Chưa có thông báo</p>
              </GlassCard>
            ) : (
              notifs.map((n, i) => {
                const kind = mapType(n.type);
                const meta = TYPE_META[kind];
                const Icon = meta.icon;
                const unread = !(n.read ?? n.is_read);
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => unread && notificationsApi.markRead(n.id)}
                  >
                    <GlassCard className={`p-4 ${unread ? "border-l-4 border-l-[#2563EB]" : ""}`} hover>
                      <div className="flex gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold text-gray-900 line-clamp-1 ${!unread ? "opacity-80" : ""}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body || n.message}</p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {tab === 0 && !orderIdParam && (
        <p className="text-center text-xs text-gray-400 lg:hidden">
          <Link href="/don-hang" className="text-[#2563EB] font-semibold no-underline">
            Xem đơn hàng
          </Link>{" "}
          để mở chat với nhà xe
        </p>
      )}
    </div>
  );
}

export default function TinNhanPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-[1400px] mx-auto">
          <Skeleton className="h-[560px] rounded-2xl" />
        </div>
      }
    >
      <TinNhanContent />
    </Suspense>
  );
}
