"use client";

import React, { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Package, ArrowUpRight, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi } from "@/lib/api";
import { formatVND, formatDate } from "@/lib/utils";

interface Completed {
  id: string; final_price?: number; estimated_price?: number;
  created_at: string; dropoff_address: string;
}

const GREEN = "#16A34A";

export default function EarningsPage() {
  const [orders,  setOrders]  = useState<Completed[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await ordersApi.list({ status: "completed" });
      if (r.success && r.data) {
        const d = r.data as { orders?: Completed[] } | Completed[];
        setOrders(Array.isArray(d) ? d : (d?.orders ?? []));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const total = orders.reduce((s, o) => s + (o.final_price ?? o.estimated_price ?? 0), 0);
  const net   = total * 0.9;
  const fee   = total * 0.1;
  const avg   = orders.length > 0 ? Math.round(total / orders.length) : 0;

  const byMonth: Record<string, { total: number; count: number }> = {};
  orders.forEach(o => {
    const m = new Date(o.created_at).toLocaleString("vi-VN", { month: "long", year: "numeric" });
    if (!byMonth[m]) byMonth[m] = { total: 0, count: 0 };
    byMonth[m].total += (o.final_price ?? o.estimated_price ?? 0);
    byMonth[m].count++;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thu nhập</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tổng quan doanh thu và lịch sử giao dịch</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue hero card */}
        <div className="rounded-2xl p-5 lg:col-span-2 text-white"
          style={{ background: "linear-gradient(135deg, #14532d 0%, #16a34a 100%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={17} className="text-green-200" />
            <p className="text-green-100 text-sm font-medium">Tổng doanh thu</p>
          </div>
          {loading
            ? <div className="h-9 w-40 rounded-lg mb-1 animate-pulse bg-white/20" />
            : <p className="text-3xl font-extrabold">{formatVND(total)}</p>
          }
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-green-200 text-xs mb-0.5">Thực nhận (90%)</p>
              <p className="text-xl font-bold">{formatVND(net)}</p>
            </div>
            <div>
              <p className="text-green-200 text-xs mb-0.5">Phí nền tảng (10%)</p>
              <p className="text-xl font-bold text-yellow-200">{formatVND(fee)}</p>
            </div>
          </div>
        </div>

        {/* Total trips */}
        <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Package size={20} className="text-[#2563EB]" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{orders.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Tổng chuyến hoàn thành</p>
        </div>

        {/* Average per trip */}
        <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{formatVND(avg)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Trung bình/chuyến</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly breakdown */}
        {Object.keys(byMonth).length > 0 && (
          <div className="lg:col-span-1">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Thu nhập theo tháng</h3>
            <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm divide-y divide-gray-50">
              {Object.entries(byMonth).map(([month, data]) => (
                <div key={month} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{month}</p>
                    <p className="text-xs text-gray-400">{data.count} chuyến</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ArrowUpRight size={13} style={{ color: GREEN }} />
                    <span className="font-bold text-sm" style={{ color: GREEN }}>{formatVND(data.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction history */}
        <div className={Object.keys(byMonth).length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
          <h3 className="text-sm font-bold text-gray-900 mb-3">Lịch sử giao dịch</h3>
          <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <DollarSign size={28} className="text-gray-300" />
                </div>
                <p className="font-semibold text-gray-900">Chưa có giao dịch</p>
                <p className="text-sm text-gray-400 mt-1">Hoàn thành chuyến đầu tiên để xem thu nhập</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Mô tả</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Ngày</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Doanh thu</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Thực nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.slice(0, 20).map(o => (
                      <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                              <Package size={14} style={{ color: GREEN }} />
                            </div>
                            <span className="font-medium text-gray-900 max-w-[160px] truncate block">
                              {o.dropoff_address}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400">{formatDate(o.created_at)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
                          {formatVND(o.final_price ?? o.estimated_price ?? 0)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold" style={{ color: GREEN }}>
                          +{formatVND((o.final_price ?? o.estimated_price ?? 0) * 0.9)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}