"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ImagePlus,
  Info,
  Lightbulb,
  MapPin,
  Send,
  Headphones,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { marketplaceApi } from "@/lib/api";
import { useUIStore } from "@/lib/stores";
import { cn, formatVND } from "@/lib/utils";

const CATEGORIES = [
  { value: "", label: "Chọn danh mục" },
  { value: "furniture", label: "Nội thất" },
  { value: "electronics", label: "Điện tử" },
  { value: "appliances", label: "Gia dụng" },
  { value: "clothes", label: "Quần áo" },
  { value: "books", label: "Sách vở" },
  { value: "other", label: "Khác" },
];

const CONDITIONS = [
  { value: "new", label: "Mới" },
  { value: "like_new", label: "Như mới" },
  { value: "good", label: "Tốt" },
  { value: "fair", label: "Khá" },
  { value: "poor", label: "Cũ" },
];

const TIPS = [
  "Chụp ảnh rõ nét, đủ ánh sáng và nhiều góc.",
  "Mô tả chi tiết tình trạng, kích thước và lý do bán.",
  "Đặt giá hợp lý để thu hút người mua nhanh hơn.",
];

const DRAFT_KEY = "unimove-marketplace-listing-draft";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

export default function DangTinPage() {
  const router = useRouter();
  const { showSuccess, showError } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    condition: "new",
    area: "",
    price: "",
    usage_duration: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as typeof form;
      setForm((p) => ({ ...p, ...saved }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  const onPickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setImages((prev) => [...prev, ...files].slice(0, 6));
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    showSuccess("Đã lưu nháp trên thiết bị này");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showError("Nhập tiêu đề tin");
      return;
    }
    if (!form.category) {
      showError("Chọn danh mục");
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      showError("Giá không hợp lệ");
      return;
    }
    setLoading(true);
    try {
      let imageUrls: string[] = [];
      if (images.length) {
        const up = await marketplaceApi.uploadImages(images);
        imageUrls = up.data ?? [];
      }
      const res = await marketplaceApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        condition: form.condition,
        area: form.area.trim() || undefined,
        price,
        images: imageUrls,
        usage_duration: form.usage_duration.trim() || undefined,
      });
      if (!res.success) {
        showError((res as { message?: string }).message || "Đăng tin thất bại");
        return;
      }
      const data = res.data as { id?: string };
      const fee = (res as { listing_fee?: { requires_payment?: boolean; amount?: number } })
        .listing_fee;
      localStorage.removeItem(DRAFT_KEY);
      if (fee?.requires_payment && data?.id) {
        try {
          const pay = await marketplaceApi.payListingFee(data.id, { payment_method: "payos" });
          const checkout = (pay.data as { checkout_url?: string })?.checkout_url;
          if (checkout) {
            window.location.href = checkout;
            return;
          }
        } catch {
          showError(
            `Tin đã tạo. Phí đăng tin ${formatVND(fee.amount ?? 0)} — thanh toán sau trong Tin của tôi.`
          );
        }
      }
      showSuccess("Đăng tin thành công!");
      router.push(data?.id ? `/cho-sinh-vien/${data.id}` : "/cho-sinh-vien/tin-cua-toi");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  const emptySlots = Math.max(0, 6 - images.length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-28 lg:px-8 lg:py-8">
      {/* Page header */}
      <div className="mb-6 flex items-start gap-3">
          <Link
            href="/cho-sinh-vien"
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              Đăng tin mới
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Điền thông tin chi tiết để rao bán mặt hàng của bạn
            </p>
          </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          {/* Left — form */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
            <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                <Info size={16} />
              </span>
              <h2 className="text-base font-bold text-gray-900">Thông tin cơ bản</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-800">
                  Tiêu đề tin đăng <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="VD: Bàn học + ghế"
                  className="mt-1.5 h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-800">Mô tả chi tiết</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={5}
                  className={cn(fieldClass, "resize-y min-h-[120px]")}
                  placeholder="Mô tả tình trạng, kích thước, lý do bán..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-800">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                    className={fieldClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value || "empty"} value={c.value} disabled={!c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-800">
                    Tình trạng <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.condition}
                    onChange={(e) => set("condition", e.target.value)}
                    className={fieldClass}
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-800">
                    Giá (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Input
                      type="number"
                      min={0}
                      required
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                      placeholder="0"
                      className="h-11 rounded-xl pr-10"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                      đ
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-800">Khu vực</label>
                  <div className="relative mt-1.5">
                    <MapPin
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      value={form.area}
                      onChange={(e) => set("area", e.target.value)}
                      placeholder="Quận/Huyện, Thành phố"
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-800">Thời gian đã sử dụng</label>
                <Input
                  value={form.usage_duration}
                  onChange={(e) => set("usage_duration", e.target.value)}
                  placeholder="VD: 1 năm, 6 tháng"
                  className="mt-1.5 h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={saveDraft}
                className="h-11 rounded-xl border-gray-200 px-6 font-semibold"
              >
                Lưu nháp
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="h-11 gap-2 rounded-xl bg-[#2563EB] px-8 font-bold hover:bg-[#1D4ED8]"
              >
                <Send size={16} />
                Đăng tin ngay
              </Button>
            </div>
          </div>

          {/* Right — images, tips, support */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <ImagePlus size={18} className="text-[#2563EB]" />
                <h3 className="text-sm font-bold text-gray-900">Hình ảnh</h3>
              </div>
              <p className="mb-4 text-xs text-gray-500">Tối đa 6 hình ảnh. Định dạng: JPG, PNG.</p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 6}
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition",
                  images.length >= 6
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                    : "border-[#BFDBFE] bg-[#F8FAFC] hover:border-[#2563EB] hover:bg-[#EFF6FF]"
                )}
              >
                <ImagePlus size={28} className="mb-2 text-[#2563EB]" />
                <span className="text-sm font-semibold text-[#2563EB]">Chọn ảnh sản phẩm</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={onPickImages}
              />

              <div className="mt-4 grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div
                    key={src}
                    className="relative aspect-square overflow-hidden rounded-lg border border-gray-100 bg-gray-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/70"
                      aria-label="Xóa ảnh"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex aspect-square items-center justify-center rounded-lg border border-gray-100 bg-gray-50"
                  >
                    <ImagePlus size={18} className="text-gray-300" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-500" />
                <h3 className="text-sm font-bold text-gray-900">Mẹo đăng tin hiệu quả</h3>
              </div>
              <ul className="space-y-3">
                {TIPS.map((tip) => (
                  <li key={tip} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#2563EB]" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] p-5 text-white shadow-md">
              <Headphones
                size={72}
                className="pointer-events-none absolute -bottom-2 -right-2 text-white/10"
                strokeWidth={1}
              />
              <p className="text-sm font-bold">Cần hỗ trợ?</p>
              <p className="mt-1 text-xs leading-relaxed text-blue-100">
                Nhân viên hỗ trợ của chúng tôi sẵn sàng giúp bạn đăng tin nhanh chóng.
              </p>
              <Link
                href="/tin-nhan"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#FACC15] px-5 py-2.5 text-sm font-bold text-gray-900 no-underline transition hover:bg-[#EAB308]"
              >
                Chat ngay
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
