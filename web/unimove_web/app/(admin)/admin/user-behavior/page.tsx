"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  ExternalLink,
  Globe,
  MousePointerClick,
  RefreshCw,
  Shield,
} from "lucide-react";
import { adminApi } from "@/lib/admin/api";
import { PageHeader } from "@/components/admin-dashboard/page-header";
import { EmptyState } from "@/components/admin-dashboard/empty-state";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/gtag";

interface GA4Row {
  source?: string;
  medium?: string;
  sessions?: number;
  activeUsers?: number;
  pagePath?: string;
  pageViews?: number;
  eventName?: string;
  eventCount?: number;
}

interface GA4Data {
  configured: boolean;
  message?: string;
  period?: string;
  trafficSources?: GA4Row[];
  topPages?: GA4Row[];
  topEvents?: GA4Row[];
  adminPages?: GA4Row[];
}

function DataTable({
  headers,
  rows,
  renderRow,
}: {
  headers: string[];
  rows: GA4Row[];
  renderRow: (row: GA4Row, idx: number) => React.ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>
        Chưa có dữ liệu trong khoảng thời gian này.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl shadow-sm overflow-hidden"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div
        className="flex items-center gap-2 px-5 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Icon className="w-4 h-4" style={{ color: "var(--primary)" }} />
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          {title}
        </h2>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function UserBehaviorClient() {
  const [data, setData] = useState<GA4Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getGA4Analytics();
      if (res.success && res.data) {
        setData(res.data as GA4Data);
      } else {
        setError((res as { message?: string }).message || "Không tải được dữ liệu GA4");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const trackingOn = Boolean(GA_MEASUREMENT_ID);
  const chartSources = (data?.trafficSources ?? []).slice(0, 8).map((r) => ({
    name: `${r.source} / ${r.medium}`,
    sessions: r.sessions ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hành vi người dùng (GA4)"
        description="Theo dõi nguồn traffic, trang được xem và sự kiện — Google Analytics 4"
      />

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="w-4 h-4" style={{ color: "var(--primary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Thu thập sự kiện (Web)
            </span>
          </div>
          <p className="text-sm" style={{ color: trackingOn ? "#16A34A" : "var(--muted)" }}>
            {trackingOn
              ? `Đang bật — Measurement ID: ${GA_MEASUREMENT_ID}`
              : "Chưa cấu hình NEXT_PUBLIC_GA_MEASUREMENT_ID trên Vercel"}
          </p>
        </div>
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: "var(--primary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Báo cáo trong Admin
            </span>
          </div>
          <p className="text-sm" style={{ color: data?.configured ? "#16A34A" : "var(--muted)" }}>
            {data?.configured
              ? `Đã kết nối GA4 Data API — ${data.period}`
              : "Cần GA4_PROPERTY_ID + GA4_SERVICE_ACCOUNT_JSON trên Render"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
          style={{
            backgroundColor: "var(--primary)",
            color: "#fff",
          }}
        >
          <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Làm mới
        </button>
        <a
          href="https://analytics.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          Mở Google Analytics
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {loading && !data && (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--muted)" }} />
        </div>
      )}

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA" }}
        >
          {error}
        </div>
      )}

      {!data?.configured && !loading && (
        <div
          className="rounded-2xl p-6 space-y-3 text-sm"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <p className="font-semibold" style={{ color: "var(--text)" }}>
            Hướng dẫn cấu hình GA4
          </p>
          <ol className="list-decimal list-inside space-y-2" style={{ color: "var(--muted)" }}>
            <li>Tạo property GA4 tại Google Analytics → lấy <strong>Measurement ID</strong> (G-XXXX).</li>
            <li>Thêm <code>NEXT_PUBLIC_GA_MEASUREMENT_ID</code> trên Vercel (web).</li>
            <li>Tạo Service Account trên Google Cloud → bật <strong>Google Analytics Data API</strong>.</li>
            <li>Thêm email service account vào GA4 (Quyền truy cập → Viewer).</li>
            <li>Thêm <code>GA4_PROPERTY_ID</code> (số) và <code>GA4_SERVICE_ACCOUNT_JSON</code> (JSON một dòng) trên Render (backend).</li>
          </ol>
          <p style={{ color: "var(--muted)" }}>
            Sau khi có traffic, dữ liệu nguồn đến và hành vi admin sẽ hiển thị tại đây.
          </p>
        </div>
      )}

      {data?.configured && (
        <>
          {chartSources.length > 0 && (
            <Section title="Nguồn traffic (Sessions)" icon={Globe}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartSources} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "var(--muted)" }}
                    angle={-25}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Section title="Nguồn đến (30 ngày)" icon={Globe}>
              <DataTable
                headers={["Nguồn", "Kênh", "Sessions", "Users"]}
                rows={data.trafficSources ?? []}
                renderRow={(r, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-2.5">{r.source}</td>
                    <td className="px-4 py-2.5" style={{ color: "var(--muted)" }}>{r.medium}</td>
                    <td className="px-4 py-2.5 font-medium">{r.sessions}</td>
                    <td className="px-4 py-2.5">{r.activeUsers}</td>
                  </tr>
                )}
              />
            </Section>

            <Section title="Trang Admin được xem" icon={Shield}>
              <DataTable
                headers={["Đường dẫn", "Lượt xem", "Users"]}
                rows={data.adminPages ?? []}
                renderRow={(r, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.pagePath}</td>
                    <td className="px-4 py-2.5 font-medium">{r.pageViews}</td>
                    <td className="px-4 py-2.5">{r.activeUsers}</td>
                  </tr>
                )}
              />
            </Section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Section title="Trang phổ biến (toàn site)" icon={Activity}>
              <DataTable
                headers={["Trang", "Lượt xem", "Users"]}
                rows={data.topPages ?? []}
                renderRow={(r, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.pagePath}</td>
                    <td className="px-4 py-2.5 font-medium">{r.pageViews}</td>
                    <td className="px-4 py-2.5">{r.activeUsers}</td>
                  </tr>
                )}
              />
            </Section>

            <Section title="Sự kiện GA4 (Event-based)" icon={MousePointerClick}>
              <DataTable
                headers={["Sự kiện", "Số lần"]}
                rows={data.topEvents ?? []}
                renderRow={(r, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.eventName}</td>
                    <td className="px-4 py-2.5 font-medium">{r.eventCount}</td>
                  </tr>
                )}
              />
            </Section>
          </div>
        </>
      )}

      {!data?.configured && !loading && !error && (
        <EmptyState
          icon={Activity}
          title="Chưa có báo cáo GA4"
          description="Cấu hình biến môi trường để xem nguồn traffic và hành vi người dùng ngay trong admin."
        />
      )}
    </div>
  );
}

export default function UserBehaviorPage() {
  return <UserBehaviorClient />;
}
