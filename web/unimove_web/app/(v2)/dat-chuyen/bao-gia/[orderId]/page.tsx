"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RefreshCw, Star, Truck } from "lucide-react";
import { BookingShell } from "@/components/booking/BookingShell";
import { ordersApi, quotesApi } from "@/lib/api";
import { formatVND } from "@/lib/utils";
import { useUIStore } from "@/lib/stores";

interface Quote {
  id: string;
  provider_id: string;
  total_price: number;
  base_price: number;
  note?: string;
  provider_name?: string;
  status: string;
}

export default function BaoGiaPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { showSuccess, showError } = useUIStore();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orderStatus, setOrderStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    const [orderRes, quotesRes] = await Promise.all([
      ordersApi.get(orderId),
      quotesApi.list(orderId),
    ]);
    if (orderRes.success && orderRes.data) {
      setOrderStatus((orderRes.data as { status: string }).status);
    }
    if (quotesRes.success) {
      const d = quotesRes.data as { quotes?: Quote[] };
      setQuotes(d?.quotes ?? (Array.isArray(quotesRes.data) ? quotesRes.data as Quote[] : []));
    }
  }, [orderId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const selectQuote = async (quoteId: string) => {
    setActing(true);
    try {
      await quotesApi.select(orderId, quoteId);
      showSuccess("Đã chốt nhà xe");
      router.push(`/don-hang/${orderId}`);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Không chọn được báo giá");
    } finally {
      setActing(false);
    }
  };

  return (
    <BookingShell
      title="Chờ báo giá"
      subtitle="Các nhà xe đang xem yêu cầu của bạn. Thường phản hồi trong ~30 phút."
      backHref="/hoat-dong"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-gray-500">Mã đơn #{orderId.slice(0, 8).toUpperCase()}</p>
        <button type="button" onClick={() => load()} className="flex items-center gap-1 text-sm text-[#0047FF]">
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Đang tải báo giá...</p>
      ) : quotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <Truck className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="font-semibold text-gray-900">Chưa có báo giá</p>
          <p className="mt-1 text-sm text-gray-500">Hệ thống đang gửi yêu cầu đến nhà xe phù hợp...</p>
          <Link href={`/don-hang/${orderId}`} className="mt-4 inline-block text-sm font-medium text-[#0047FF]">
            Xem chi tiết đơn →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <div key={q.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">{q.provider_name ?? "Nhà xe"}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <Star size={12} fill="currentColor" /> Đánh giá tốt
                  </div>
                  {q.note && <p className="mt-2 text-xs text-gray-500">{q.note}</p>}
                </div>
                <p className="text-lg font-bold text-[#0047FF]">{formatVND(q.total_price ?? q.base_price)}</p>
              </div>
              {q.status === "pending" && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => selectQuote(q.id)}
                  className="mt-3 w-full rounded-full bg-[#0047FF] py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  Chốt nhà xe này
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {orderStatus !== "pending" && (
        <Link href={`/don-hang/${orderId}`} className="mt-6 block text-center text-sm font-medium text-[#0047FF]">
          Tiếp tục theo dõi đơn hàng →
        </Link>
      )}
    </BookingShell>
  );
}
