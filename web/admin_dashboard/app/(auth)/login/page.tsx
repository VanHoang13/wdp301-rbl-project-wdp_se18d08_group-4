"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Mail, Lock, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log('========================================');
    console.log('🔐 BẮT ĐẦU ĐĂNG NHẬP');
    console.log('Email:', email);
    console.log('API URL:', API_URL);
    console.log('Full URL:', `${API_URL}/admin/auth/login`);
    console.log('========================================');

    try {
      const url = `${API_URL}/admin/auth/login`;
      const body = { email, password };
      
      console.log('📡 Đang gọi API...');
      console.log('URL:', url);
      console.log('Body:', body);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }).catch(fetchError => {
        console.error('🌐 Network fetch failed:', fetchError);
        console.error('Fetch error name:', fetchError.name);
        console.error('Fetch error message:', fetchError.message);
        throw new Error(`Lỗi kết nối: ${fetchError.message}. Vui lòng kiểm tra backend có đang chạy không.`);
      });

      console.log('📥 Nhận được response!');
      console.log('Response object:', response);
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('OK?:', response.ok);
      console.log('Headers:', Array.from(response.headers.entries()));
      
      console.log('🔍 Parsing JSON...');
      let data;
      try {
        const responseText = await response.text();
        console.log('📄 Raw response text:', responseText);
        data = JSON.parse(responseText);
        console.log('✅ JSON parsed successfully');
      } catch (jsonError) {
        console.error('❌ JSON parse failed:', jsonError);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('📦 Dữ liệu response:');
      console.log('Success:', data.success);
      console.log('Message:', data.message);
      console.log('Data:', data.data);

      if (!response.ok || !data.success) {
        console.error('❌ ĐĂNG NHẬP THẤT BẠI!');
        console.error('Lý do:', data.message);
        setError(data.message || "Sai email hoặc mật khẩu");
        setLoading(false);
        return;
      }

      // Check admin role
      console.log('🔍 Kiểm tra quyền admin...');
      console.log('User role:', data.data.user.role);
      
      if (data.data.user.role !== 'admin') {
        console.error('❌ KHÔNG PHẢI ADMIN!');
        console.error('Role hiện tại:', data.data.user.role);
        setError("Bạn không có quyền admin");
        setLoading(false);
        return;
      }

      console.log('✅ ĐĂNG NHẬP THÀNH CÔNG!');
      console.log('💾 Đang lưu token vào localStorage và cookies...');

      // Save token to localStorage
      const token = data.data.accessToken;
      const user = data.data.user;
      
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      
      // IMPORTANT: Save to cookie for middleware
      document.cookie = `admin_token=${token}; path=/; max-age=604800; SameSite=Lax`; // 7 days
      document.cookie = `admin_user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=604800; SameSite=Lax`;

      console.log('✅ Đã lưu token:', token.substring(0, 20) + '...');
      console.log('✅ Đã lưu user:', user.email);
      
      // Verify localStorage
      const savedToken = localStorage.getItem('admin_token');
      const savedUser = localStorage.getItem('admin_user');
      const cookieToken = document.cookie.includes('admin_token');
      console.log('🔍 Kiểm tra storage:');
      console.log('LocalStorage token?', savedToken ? 'YES' : 'NO');
      console.log('LocalStorage user?', savedUser ? 'YES' : 'NO');
      console.log('Cookie saved?', cookieToken ? 'YES' : 'NO');

      console.log('🚀 ĐANG CHUYỂN HƯỚNG ĐÊN /dashboard...');
      
      // Redirect to dashboard
      window.location.href = "/dashboard";
      
    } catch (err) {
      console.error('========================================');
      console.error('💥 LỖI NGHIÊM TRỌNG!');
      console.error('Error:', err);
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown error');
      console.error('========================================');
      setError("Không thể kết nối đến server. Vui lòng kiểm tra xem backend có đang chạy không.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8 shadow-lg"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-2xl"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <Truck size={24} className="text-white" />
          </div>
          <div className="text-center">
            <h1
              className="text-xl font-bold tracking-tight"
              style={{ color: "var(--text)" }}
            >
              UniMove Admin
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Đăng nhập vào trang quản trị
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@unimove.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              startAdornment={
                <Mail size={15} style={{ color: "var(--muted)" }} />
              }
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              Mật khẩu
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              startAdornment={
                <Lock size={15} style={{ color: "var(--muted)" }} />
              }
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Đang đăng nhập...
                </span>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-6">
          <p
            className="text-center text-xs"
            style={{ color: "var(--muted)" }}
          >
            UniMove Admin Dashboard · Chỉ dành cho quản trị viên
          </p>
          <p
            className="text-center text-xs mt-2"
            style={{ color: "var(--muted-foreground)" }}
          >
            Test account: admin@unimove.com / Admin123!@#
          </p>
        </div>
      </div>
    </div>
  );
}
