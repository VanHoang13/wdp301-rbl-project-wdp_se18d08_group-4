"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock, LocateFixed, MapPin, Search, Truck } from "lucide-react";
import { AddressAutocomplete } from "@/components/maps/address-autocomplete";
import {
  BookingWizardLayout,
  BookingInsuranceCard,
  QUOTE_WIZARD_STEPS,
  COMBO_WIZARD_STEPS,
} from "@/components/booking/BookingWizardLayout";
import { customerApi, mapsApi } from "@/lib/api";
import { useBookingFlowStore } from "@/lib/stores/useBookingFlowStore";

interface RecentPlace {
  label: string;
  detail: string;
  lat?: number;
  lng?: number;
}

function LocationFieldCard({
  icon,
  iconBg,
  title,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function DiaDiemPage() {
  const router = useRouter();
  const {
    isComboBooking,
    serviceKind,
    pickup,
    destination,
    setPickup,
    setDestination,
  } = useBookingFlowStore();

  const isLaborOnly = serviceKind === "laborOnly";

  const [recentPlaces, setRecentPlaces] = useState<RecentPlace[]>([]);
  const [defaultPickup, setDefaultPickup] = useState("");
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      customerApi.getBookingLocations(),
      customerApi.getRecentPlaces(),
    ]).then(([locRes, recentRes]) => {
      if (locRes.status === "fulfilled" && locRes.value.success && locRes.value.data) {
        const d = locRes.value.data as Record<string, unknown>;
        const dp = d.default_pickup as { address?: string; lat?: number; lng?: number } | string | undefined;
        if (typeof dp === "string") {
          setDefaultPickup(dp);
          if (!pickup) setPickup(dp);
        } else if (dp?.address) {
          setDefaultPickup(dp.address);
          if (!pickup) setPickup(dp.address, dp.lat ?? null, dp.lng ?? null);
        }
      }
      if (recentRes.status === "fulfilled" && recentRes.value.success && Array.isArray(recentRes.value.data)) {
        const seen = new Set<string>();
        const places = recentRes.value.data
          .map((p) => ({
            label: ("label" in p ? p.label : p.title) ?? "Địa chỉ",
            detail: p.address,
            lat: ("lat" in p ? p.lat : undefined) as number | undefined,
            lng: ("lng" in p ? p.lng : undefined) as number | undefined,
          }))
          .filter((p) => {
            const key = p.detail.trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        setRecentPlaces(places);
      }
    }).finally(() => setLoading(false));
  }, []);

  const useGps = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await mapsApi.resolveAddress(`${pos.coords.latitude},${pos.coords.longitude}`);
          const d = res.data as { address?: string; lat?: number; lng?: number };
          if (d?.address) {
            setPickup(d.address, d.lat ?? pos.coords.latitude, d.lng ?? pos.coords.longitude);
          }
        } catch {
          setPickup(`${pos.coords.latitude}, ${pos.coords.longitude}`, pos.coords.latitude, pos.coords.longitude);
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const title = isLaborOnly ? "Địa điểm làm việc" : "Trọ cũ → trọ mới";
  const subtitle = isComboBooking
    ? "Combo — giá niêm yết. Bước tiếp: mô tả trọ → chọn ngày giờ → chọn gói."
    : "Bước tiếp: mô tả trọ → chọn giờ → nhà xe báo giá theo khung đó.";
  const canContinue = isLaborOnly
    ? destination.trim().length > 0
    : pickup.trim().length > 0 && destination.trim().length > 0;

  const steps = isComboBooking ? [...COMBO_WIZARD_STEPS] : [...QUOTE_WIZARD_STEPS];

  return (
    <BookingWizardLayout
      steps={steps}
      currentStep={1}
      title={title}
      subtitle={subtitle}
      segmentProgress={{ current: 1, total: isComboBooking ? 6 : 3 }}
      sidebar={<BookingInsuranceCard />}
      onContinue={() =>
        router.push(isLaborOnly ? "/dat-chuyen/khuan-vac/cau-hinh" : "/dat-chuyen/phong-tro")
      }
      continueDisabled={!canContinue}
    >
      {!isLaborOnly && (
        <LocationFieldCard
          icon={<MapPin size={20} className="text-[#0047FF]" />}
          iconBg="#EFF6FF"
          title="Trọ cũ (lấy đồ)"
        >
          <div className="relative">
            <AddressAutocomplete
              value={pickup}
              placeholder={defaultPickup || "Nhập địa chỉ lấy đồ của bạn"}
              onChange={(v, meta) => setPickup(v, meta?.lat, meta?.lng)}
              inputClassName="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 pl-4 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0047FF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20"
            />
            <button
              type="button"
              onClick={useGps}
              disabled={locating}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#0047FF] transition hover:bg-blue-50 disabled:opacity-50"
              aria-label="Dùng vị trí hiện tại"
            >
              <LocateFixed size={20} className={locating ? "animate-pulse" : ""} />
            </button>
          </div>
        </LocationFieldCard>
      )}

      <LocationFieldCard
        icon={<Truck size={20} className="text-[#F59E0B]" />}
        iconBg="#FEF3C7"
        title={isLaborOnly ? "Địa chỉ làm việc" : "Trọ mới (giao đồ)"}
      >
        <div className="relative">
          <AddressAutocomplete
            value={destination}
            placeholder="Nhập địa chỉ giao đồ của bạn"
            pickupAddress={pickup}
            onChange={(v, meta) => setDestination(v, meta?.lat, meta?.lng)}
            inputClassName="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 pl-4 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0047FF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20"
          />
          <Search
            size={20}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
      </LocationFieldCard>

      {!loading && recentPlaces.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            Địa điểm gần đây
          </p>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {recentPlaces.map((place, i) => (
              <button
                key={`${place.detail}-${i}`}
                type="button"
                onClick={() => setDestination(place.detail, place.lat ?? null, place.lng ?? null)}
                className="flex w-full items-center gap-4 border-b border-gray-50 px-4 py-4 text-left transition last:border-b-0 hover:bg-gray-50/80"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Clock size={16} className="text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{place.label}</p>
                  <p className="truncate text-xs text-gray-500">{place.detail}</p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      )}
    </BookingWizardLayout>
  );
}
