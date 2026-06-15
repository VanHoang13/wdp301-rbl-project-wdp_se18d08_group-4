"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, CheckCircle, Shield, AlertTriangle } from "lucide-react";
import { providerApi } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";

const DOCS = [
  { key: "cccd_front",          label: "CCCD/CMND (mặt trước)",  required: true },
  { key: "cccd_back",           label: "CCCD/CMND (mặt sau)",    required: true },
  { key: "vehicle_registration",label: "Đăng ký xe",             required: true },
  { key: "driver_license",      label: "Bằng lái xe",            required: true },
  { key: "vehicle_photo",       label: "Ảnh phương tiện",        required: false },
];

const GREEN = "#16A34A";

export default function DocumentsPage() {
  const { toast } = useToast();
  const user      = getStoredUser();

  const [files,    setFiles]    = useState<Record<string, File | null>>(Object.fromEntries(DOCS.map(d => [d.key, null])));
  const [previews, setPreviews] = useState<Record<string, string>>(Object.fromEntries(DOCS.map(d => [d.key, ""])));
  const [loading,  setLoading]  = useState(false);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFile = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFiles(p  => ({ ...p, [key]: f }));
    setPreviews(p => ({ ...p, [key]: URL.createObjectURL(f) }));
  };

  const handleSubmit = async () => {
    const missing = DOCS.filter(d => d.required && !files[d.key]).map(d => d.label);
    if (missing.length > 0) { toast(`Vui lòng upload: ${missing.join(", ")}`, "error"); return; }
    setLoading(true);
    try {
      const toUpload: Record<string, File> = {};
      Object.entries(files).forEach(([k, v]) => { if (v) toUpload[k] = v; });
      await providerApi.uploadDocuments(toUpload);
      toast("Upload thành công! Chờ admin xét duyệt.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload thất bại", "error");
    } finally { setLoading(false); }
  };

  const uploadedCount = Object.values(files).filter(Boolean).length;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <button className="w-9 h-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Xác minh tài khoản</h1>
          <p className="text-sm text-gray-500 mt-0.5">{uploadedCount}/{DOCS.length} giấy tờ đã tải lên</p>
        </div>
      </div>

      {/* Status card */}
      {user?.is_verified ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
          <CheckCircle size={22} style={{ color: GREEN }} className="shrink-0" />
          <div>
            <p className="font-bold" style={{ color: GREEN }}>Tài khoản đã được xác minh</p>
            <p className="text-xs text-green-600 mt-0.5">Bạn có thể nhận đơn bình thường</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
          <AlertTriangle size={22} className="text-yellow-600 shrink-0" />
          <div>
            <p className="font-bold text-yellow-700">Chưa xác minh</p>
            <p className="text-xs text-yellow-600 mt-0.5">Upload đủ giấy tờ, duyệt trong 24 giờ</p>
          </div>
        </div>
      )}

      {/* Benefits */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
        <Shield size={15} className="shrink-0 mt-0.5 text-[#2563EB]" />
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Tăng độ tin cậy với khách hàng</li>
          <li>• Bắt buộc để nhận đơn hàng</li>
          <li>• Ưu tiên hiển thị trong danh sách tài xế</li>
        </ul>
      </div>

      {/* Document upload cards */}
      <div className="space-y-3">
        {DOCS.map(({ key, label, required }) => {
          const isUploaded = !!files[key];
          return (
            <div key={key}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={el => { refs.current[key] = el; }}
                onChange={e => handleFile(key, e)}
              />
              <button
                onClick={() => refs.current[key]?.click()}
                className="w-full p-4 rounded-2xl border-2 flex items-center gap-3 text-left transition-all hover:shadow-sm"
                style={{
                  backgroundColor: isUploaded ? "#F0FDF4" : "#FFFFFF",
                  borderColor:     isUploaded ? GREEN : "#E5E7EB",
                }}
              >
                {/* Preview / icon */}
                {previews[key] ? (
                  <img src={previews[key]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100" />
                ) : (
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isUploaded ? "#DCFCE7" : "#F9FAFB" }}
                  >
                    {isUploaded
                      ? <CheckCircle size={24} style={{ color: GREEN }} />
                      : <Upload size={22} className="text-gray-300" />
                    }
                  </div>
                )}

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: isUploaded ? GREEN : "#111827" }}>
                      {label}
                    </p>
                    {required && !isUploaded && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold bg-red-500">
                        Bắt buộc
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: isUploaded ? GREEN : "#9CA3AF" }}>
                    {isUploaded ? "✓ Đã tải lên · Nhấn để thay đổi" : "Nhấn để chọn ảnh"}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full h-13 rounded-full text-white font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(135deg, #15803d, #16a34a)",
          boxShadow:  "0 6px 20px rgba(22,163,74,0.30)",
          height:     52,
        }}
      >
        <Upload size={18} />
        {loading ? "Đang gửi..." : "Gửi giấy tờ xác minh"}
      </button>
    </div>
  );
}