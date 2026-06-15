"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBookingFlowStore } from "@/lib/stores/useBookingFlowStore";

function RedirectContent() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const mode = sp.get("mode");
    const loai = sp.get("loai");
    const laborOnly = sp.get("laborOnly");
    const store = useBookingFlowStore.getState();
    store.resetFlow();

    if (loai === "khuan-vac") {
      store.setServiceKind("laborAddon");
      router.replace("/dat-chuyen/khuan-vac");
      return;
    }
    if (laborOnly === "1") {
      store.setServiceKind("laborOnly");
      router.replace("/dat-chuyen/dia-diem");
      return;
    }
    if (mode === "combo") {
      store.setIsComboBooking(true);
    } else {
      store.setIsComboBooking(false);
    }
    router.replace("/dat-chuyen/dia-diem");
  }, [router, sp]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-gray-500">Đang mở luồng đặt chuyến...</p>
    </div>
  );
}

export default function DatChuyenEntryPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-gray-500">Đang tải...</div>}>
      <RedirectContent />
    </Suspense>
  );
}
