"use client";

import React, { useState } from "react";
import { MapPin, Navigation, Package, ChevronRight, Info, Clock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { ordersApi } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

const VEHICLE_OPTIONS = [
  { id: "motorbike", label: "Xe máy", desc: "< 30 kg", icon: "🛵", base: 25000 },
  { id: "van",       label: "Xe tải nhỏ", desc: "< 500 kg", icon: "🚐", base: 80000 },
  { id: "truck",     label: "Xe tải lớn", desc: "> 500 kg", icon: "🚚", base: 150000 },
];

const RECENT_PLACES = [
  { label: "Ký túc xá FPTU HCM", detail: "Đường D1, Khu CNC, Q.9, TP.HCM" },
  { label: "Vinhomes Grand Park", detail: "Nguyễn Xiển, Long Bình, Q.9, TP.HCM" },
  { label: "Bình Dương Tower", detail: "3C Phú Lợi, TP. Thủ Dầu Một, Bình Dương" },
];

export default function DatChuyenPage() {
  const router = useRouter();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [vehicle, setVehicle] = useState("van");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = VEHICLE_OPTIONS.find(v => v.id === vehicle)!;
  const canSubmit = pickup.trim() && dropoff.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const user = getStoredUser();
    if (!user) { router.push("/login"); return; }
    setLoading(true);
    setError("");
    try {
      const r = await ordersApi.create({
        pickup_address: pickup,
        dropoff_address: dropoff,
        vehicle_type: vehicle,
        note,
      });
      if (r.success && r.data) {
        const id = (r.data as { id?: string })?.id ?? (r.data as { order?: { id: string } })?.order?.id;
        if (id) { router.push(`/don-hang/${id}`); return; }
        router.push("/don-hang");
      } else {
        setError(r.message ?? "Không thể đặt chuyến. Vui lòng thử lại.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pb-8 pt-5 max-w-2xl mx-auto lg:max-w-4xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Đặt chuyến</h1>
        <p className="text-sm text-gray-500 mt-0.5">Điền thông tin để đặt dịch vụ chuyển trọ</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Route Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hành trình</p>

          {/* Pickup */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
              Điểm đón
            </label>
            <input
              value={pickup}
              onChange={e => setPickup(e.target.value)}
              placeholder="Nhập địa chỉ đón hàng..."
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white transition-all"
            />
          </div>

          {/* Divider with arrow */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-dashed border-gray-200" />
            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
              <ArrowRight size={13} className="text-[#2563EB]" />
            </div>
            <div className="flex-1 border-t border-dashed border-gray-200" />
          </div>

          {/* Dropoff */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <MapPin size={10} className="text-green-500" />
              Điểm đến
            </label>
            <input
              value={dropoff}
              onChange={e => setDropoff(e.target.value)}
              placeholder="Nhập địa chỉ giao hàng..."
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Vehicle Selection */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loại xe</p>
          <div className="grid grid-cols-3 gap-2.5">
            {VEHICLE_OPTIONS.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehicle(v.id)}
                className="py-3 px-2 rounded-xl border-2 text-center transition-all"
                style={{
                  borderColor: vehicle === v.id ? "#2563EB" : "#E5E7EB",
                  backgroundColor: vehicle === v.id ? "#EFF6FF" : "#FAFAFA",
                }}
              >
                <span className="text-2xl block mb-1">{v.icon}</span>
                <p className="text-xs font-bold text-gray-900">{v.label}</p>
                <p className="text-[11px] text-gray-400">{v.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ghi chú (tùy chọn)</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Số tầng, thang máy, đồ vật đặc biệt..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white resize-none transition-all"
          />
        </div>

        {/* Price estimate */}
        {canSubmit && (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-blue-50 border border-blue-100">
            <Info size={16} className="text-[#2563EB] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#2563EB]">Giá ước tính</p>
              <p className="text-xs text-blue-600">Từ {selected.base.toLocaleString("vi-VN")}đ — tài xế sẽ xác nhận giá cuối</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full h-13 rounded-full text-white font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: canSubmit ? "#2563EB" : "#94A3B8",
            boxShadow: canSubmit ? "0 6px 20px rgba(37,99,235,0.30)" : "none",
            height: 52,
          }}
        >
          {loading ? "Đang đặt chuyến..." : "Đặt chuyến ngay"}
        </button>
      </form>

      {/* Recent places */}
      {!pickup && !dropoff && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Địa điểm gần đây</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {RECENT_PLACES.map(place => (
              <button
                key={place.label}
                type="button"
                onClick={() => setDropoff(place.detail)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/70 transition-colors text-left"
              >
                <div className="shrink-0 w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Clock size={14} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{place.label}</p>
                  <p className="text-xs text-gray-500 truncate">{place.detail}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}