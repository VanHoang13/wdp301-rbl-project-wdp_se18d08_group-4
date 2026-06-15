"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";
import { storeAuth, storeAdminSession, getRoleHome, type AuthUser } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";

function UniMoveLogo() {
  return (
    <div className="flex items-center gap-0.5 text-4xl font-extrabold leading-none tracking-tight">
      <span className="bg-[#FFCC00] text-white rounded-xl px-2.5 py-1">Uni</span>
      <span style={{ color: "#2563EB" }}>Move</span>
    </div>
  );
}

export default function LoginPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      if (!res.success || !res.data) {
        setError((res as { message?: string }).message || "Sai email hoặc mật khẩu");
        return;
      }
      const { accessToken, user } = res.data as { accessToken: string; user: AuthUser };
      if (user.role === "admin") {
        storeAdminSession(user, accessToken);
        toast(`Chào mừng ${user.full_name}!`, "success");
        window.location.href = getRoleHome("admin");
        return;
      }
      storeAuth(user, accessToken);
      toast(`Chào mừng ${user.full_name}!`, "success");
      window.location.href = getRoleHome(user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể kết nối đến server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-5 py-10">
      {/* Logo */}
      <Link href="/" className="flex flex-col items-center mb-8 gap-2.5 no-underline">
        <UniMoveLogo />
        <p className="text-sm text-gray-500 font-medium">Chuyển trọ thông minh cho sinh viên</p>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-[0_8px_40px_rgba(37,99,235,0.10)] border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Đăng nhập</h2>

        {error && (
          <div className="flex items-start gap-2.5 mb-5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
            <p className="text-sm leading-snug text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-700">Mật khẩu</label>
              <Link href="/forgot-password" className="text-xs font-medium text-[#2563EB] hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Lock size={16} />
              </span>
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{ height: "52px" }}
            className="w-full rounded-full bg-[#2563EB] text-white font-bold text-base flex items-center justify-center gap-2 mt-2 shadow-[0_8px_24px_rgba(37,99,235,0.30)] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 whitespace-nowrap">Chưa có tài khoản?</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <Link href="/register" className="block">
          <button className="w-full h-12 rounded-full text-sm font-bold border-2 border-[#FFCC00] text-gray-800 bg-transparent hover:bg-[#FFFBEB] active:scale-[0.98] transition-all duration-200">
            Tạo tài khoản mới
          </button>
        </Link>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6 px-4">
        Hệ thống tự động chuyển đến giao diện phù hợp sau khi đăng nhập.
      </p>
    </div>
  );
}