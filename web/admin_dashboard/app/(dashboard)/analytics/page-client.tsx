"use client";

import { useEffect } from "react";
import { apiClient } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/page-header";

export function AnalyticsPageClient() {
  useEffect(() => {
    // Initialize token from localStorage
    const token = localStorage.getItem('admin_token');
    if (token) {
      apiClient.setToken(token);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Phân tích & Báo cáo"
        description="Theo dõi hiệu suất kinh doanh và xu hướng tăng trưởng"
      />

      <div className="rounded-2xl p-12 text-center" style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)"
      }}>
        <div className="text-lg font-semibold mb-2" style={{ color: "var(--text)" }}>
          Phân tích dữ liệu nâng cao
        </div>
        <p style={{ color: "var(--muted)" }}>
          Tính năng chi tiết này đang được phát triển. Vui lòng quay lại sau.
        </p>
      </div>
    </div>
  );
}
