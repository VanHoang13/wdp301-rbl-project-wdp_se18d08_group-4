"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Clock, User, CalendarDays, RefreshCw } from "lucide-react";
import { ordersApi } from "@/lib/api";
import { formatVND } from "@/lib/utils";

interface ScheduleOrder {
  id: string;
  order_number: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  scheduled_pickup_time: string;
  estimated_duration?: number;
  total_price?: number;
  customer?: { full_name: string; phone: string };
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  scheduled:   { label: "Đã lên lịch",     color: "#0891B2", bg: "#ECFEFF", border: "#A5F3FC" },
  accepted:    { label: "Đã xác nhận",     color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  picking_up:  { label: "Đang đến lấy",    color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  picked_up:   { label: "Đã lấy hàng",     color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  in_progress: { label: "Đang vận chuyển", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  delivering:  { label: "Đang giao",       color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  completed:   { label: "Hoàn thành",      color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
};

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

const WEEKDAYS = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function formatShortDate(d: Date) {
  return WEEKDAYS[d.getDay()];
}

export default function LichGiaoHangPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [orders, setOrders]       = useState<ScheduleOrder[]>([]);
  const [loading, setLoading]     = useState(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today    = new Date();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = weekStart.toISOString();
      const to   = addDays(weekStart, 7).toISOString();
      const res  = await ordersApi.mySchedule(from, to);
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data as ScheduleOrder[]);
      }
    } finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const prevWeek = () => setWeekStart(w => addDays(w, -7));
  const nextWeek = () => setWeekStart(w => addDays(w, 7));
  const goToday  = () => setWeekStart(startOfWeek(new Date()));

  const ordersOnDay = (day: Date) =>
    orders.filter(o => o.scheduled_pickup_time && sameDay(new Date(o.scheduled_pickup_time), day));

  const totalThisWeek = orders.filter(o => !["completed"].includes(o.status)).length;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-5 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>Lịch giao hàng</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {totalThisWeek > 0 ? `${totalThisWeek} chuyến tuần này` : "Không có chuyến tuần này"}
            </p>
          </div>
          <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <RefreshCw size={17} style={{ color: "var(--muted)" }} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between gap-2">
          <button onClick={prevWeek} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} />
          </button>

          <button onClick={goToday}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-colors">
            <CalendarDays size={13} />
            Hôm nay
          </button>

          <span className="text-sm font-semibold flex-1 text-center" style={{ color: "var(--text)" }}>
            {weekDays[0].toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}
            {" – "}
            {weekDays[6].toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", year: "numeric" })}
          </span>

          <button onClick={nextWeek} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day columns */}
      <div className="px-4 pt-4 space-y-3">
        {weekDays.map(day => {
          const dayOrders = ordersOnDay(day);
          const isToday   = sameDay(day, today);
          const isPast    = day < today && !isToday;

          return (
            <div key={day.toISOString()} className={`rounded-2xl overflow-hidden border ${isToday ? "border-blue-200" : "border-gray-100"}`}>
              {/* Day header */}
              <div className={`flex items-center justify-between px-4 py-2.5 ${
                isToday ? "bg-blue-50" : isPast ? "bg-gray-50" : "bg-white"
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                    isToday ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {day.getDate()}
                  </div>
                  <span className={`text-sm font-semibold ${isToday ? "text-blue-700" : "text-gray-600"}`}>
                    {formatShortDate(day).split(",")[0]}
                    {isToday && <span className="ml-1.5 text-[10px] font-bold text-blue-500 uppercase">Hôm nay</span>}
                  </span>
                </div>
                {dayOrders.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                    {dayOrders.length} chuyến
                  </span>
                )}
              </div>

              {/* Orders */}
              {dayOrders.length === 0 ? (
                <div className="px-4 py-3 bg-white">
                  <p className="text-xs text-center" style={{ color: "var(--muted)" }}>Không có chuyến</p>
                </div>
              ) : (
                <div className="bg-white divide-y divide-gray-50">
                  {dayOrders.map(order => {
                    const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.accepted;
                    return (
                      <Link key={order.id} href={`/orders/${order.id}`}>
                        <div className="px-4 py-3 hover:bg-gray-50 transition-colors"
                          style={{ borderLeft: `3px solid ${cfg.color}` }}>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} style={{ color: cfg.color }} className="shrink-0" />
                              <span className="text-sm font-bold" style={{ color: cfg.color }}>
                                {order.scheduled_pickup_time ? formatTime(order.scheduled_pickup_time) : "--:--"}
                              </span>
                              {order.estimated_duration && (
                                <span className="text-xs" style={{ color: "var(--muted)" }}>
                                  · ~{order.estimated_duration} phút
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                              {cfg.label}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-start gap-1.5">
                              <MapPin size={11} className="text-green-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-600 line-clamp-1">{order.pickup_address}</p>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <MapPin size={11} className="text-red-400 shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-600 line-clamp-1">{order.delivery_address}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            {order.customer && (
                              <div className="flex items-center gap-1">
                                <User size={11} style={{ color: "var(--muted)" }} />
                                <span className="text-xs" style={{ color: "var(--muted)" }}>{order.customer.full_name}</span>
                              </div>
                            )}
                            {order.total_price ? (
                              <span className="text-xs font-bold" style={{ color: "var(--provider)" }}>
                                {formatVND(order.total_price)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
