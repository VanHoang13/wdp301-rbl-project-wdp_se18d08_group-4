"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { marketplaceApi } from "@/lib/api";
import { useUIStore } from "@/lib/stores";
import { formatVND } from "@/lib/utils";

const CATEGORIES = [
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

export default function DangTinPage() {
  const router = useRouter();
  const { showSuccess, showError } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "furniture",
    condition: "good",
    area: "",
    price: "",
    usage_duration: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const onPickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setImages((prev) => [...prev, ...files].slice(0, 6));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { showError("Nhập tiêu đề tin"); return; }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) { showError("Giá không hợp lệ"); return; }
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
      const fee = (res as { listing_fee?: { requires_payment?: boolean; amount?: number } }).listing_fee;
      if (fee?.requires_payment && data?.id) {
        try {
          const pay = await marketplaceApi.payListingFee(data.id, { payment_method: "payos" });
          const checkout = (pay.data as { checkout_url?: string })?.checkout_url;
          if (checkout) {
            window.location.href = checkout;
            return;
          }
        } catch {
          showError(`Tin đã tạo. Phí đăng tin ${formatVND(fee.amount ?? 0)} — thanh toán sau trong Tin của tôi.`);
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

  return (
    <div className="px-4 pb-24 pt-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/cho-sinh-vien" className="p-2 rounded-xl border border-gray-200 bg-white">
          <ArrowLeft size={20} className="text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Đăng tin mới</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div>
          <label className="text-sm font-medium text-gray-700">Tiêu đề *</label>
          <Input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="VD: Bàn học + ghế" className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Mô tả</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="Mô tả chi tiết sản phẩm..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Danh mục</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-gray-200 px-3 text-sm">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Tình trạng</label>
            <select value={form.condition} onChange={(e) => set("condition", e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-gray-200 px-3 text-sm">
              {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Giá (VNĐ) *</label>
            <Input type="number" min={0} required value={form.price} onChange={(e) => set("price", e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Khu vực</label>
            <Input value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="Q.9, TP.HCM" className="mt-1" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Ảnh sản phẩm (tối đa 6)</label>
          <label className="mt-2 flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-gray-50">
            <ImagePlus size={24} className="text-gray-400 mb-1" />
            <span className="text-xs text-gray-500">Chọn ảnh</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onPickImages} />
          </label>
          {images.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{images.length} ảnh đã chọn</p>
          )}
        </div>
        <Button type="submit" loading={loading} className="w-full gap-2">
          <Tag size={16} /> Đăng tin
        </Button>
      </form>
    </div>
  );
}
