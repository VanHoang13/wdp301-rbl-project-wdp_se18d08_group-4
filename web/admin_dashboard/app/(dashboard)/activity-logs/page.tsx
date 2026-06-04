export const dynamic = "force-dynamic";
import { Suspense } from "react";
import Link from "next/link";
import { History, ArrowRight } from "lucide-react";

import {
  getOrderStatusHistory,
  getVerificationHistory,
  getRefundHistory,
} from "@/lib/queries/activity-logs";
import { formatDateTime, formatVND } from "@/lib/formatters";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import type { OrderStatus, PaymentStatus, VerificationStatus, UserRole } from "@/lib/types";
import { PaginationNav } from "./pagination-nav";

/* ─────────────────────────────────────────────────────────────────────────────
   Types inferred from query return shapes
───────────────────────────────────────────────────────────────────────────── */

type OrderHistoryRow = {
  id: string;
  from_status: string;
  to_status: string;
  notes: string | null;
  created_at: string;
  order: { id: string; order_number: string } | null;
  changer: { id: string; full_name: string; role: string } | null;
};

type VerificationHistoryRow = {
  id: string;
  full_name: string;
  business_name: string | null;
  verification_status: string;
  verification_notes: string | null;
  verified_at: string | null;
  verifier: { id: string; full_name: string } | null;
};

type RefundHistoryRow = {
  id: string;
  refund_amount: number;
  refund_reason: string;
  status: string;
  processed_at: string | null;
  order: { id: string; order_number: string } | null;
  approver: { id: string; full_name: string } | null;
};

/* ─────────────────────────────────────────────────────────────────────────────
   URL-based tab + pagination helpers
───────────────────────────────────────────────────────────────────────────── */

type TabKey = "orders" | "verifications" | "refunds";

const TABS: { key: TabKey; label: string }[] = [
  { key: "orders", label: "Đơn hàng" },
  { key: "verifications", label: "Xác minh" },
  { key: "refunds", label: "Hoàn tiền" },
];

type SearchParams = Promise<{
  tab?: string;
  page?: string;
}>;

/* ─────────────────────────────────────────────────────────────────────────────
   Role badge
───────────────────────────────────────────────────────────────────────────── */

const roleLabelMap: Record<UserRole, { label: string; color: string }> = {
  admin: { label: "Admin", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  provider: { label: "Provider", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  customer: { label: "Khách hàng", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = roleLabelMap[role as UserRole] ?? { label: role, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tab nav — URL-driven, purely server-rendered links
───────────────────────────────────────────────────────────────────────────── */

function TabNav({ activeTab }: { activeTab: TabKey }) {
  return (
    <div
      className="flex gap-1 p-1 rounded-xl w-fit mb-5"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {TABS.map(({ key, label }) => {
        const isActive = activeTab === key;
        return (
          <Link
            key={key}
            href={`/activity-logs?tab=${key}&page=1`}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={
              isActive
                ? { backgroundColor: "var(--primary)", color: "#fff" }
                : { color: "var(--muted)" }
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Table: Order Status History
───────────────────────────────────────────────────────────────────────────── */

async function OrderHistoryTable({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}) {
  const { data, meta, error } = await getOrderStatusHistory({ page, pageSize });

  if (error) {
    return (
      <p className="text-sm p-4" style={{ color: "var(--muted)" }}>
        Lỗi tải dữ liệu: {error.message}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Chưa có hoạt động"
        description="Lịch sử thay đổi trạng thái đơn hàng sẽ xuất hiện tại đây."
      />
    );
  }

  const rows = data as unknown as OrderHistoryRow[];

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Mã đơn", "Trạng thái cũ → Mới", "Người thực hiện", "Ghi chú", "Thời gian"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-[var(--surface)]"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {/* Mã đơn */}
                <td className="px-4 py-3 font-mono font-medium" style={{ color: "var(--text)" }}>
                  #{row.order?.order_number ?? "—"}
                </td>

                {/* Trạng thái cũ → Mới (timeline style) */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge type="order" status={row.from_status as OrderStatus} />
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted)" }} />
                    <StatusBadge type="order" status={row.to_status as OrderStatus} />
                  </div>
                </td>

                {/* Người thực hiện */}
                <td className="px-4 py-3">
                  {row.changer ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium" style={{ color: "var(--text)" }}>
                        {row.changer.full_name}
                      </span>
                      <RoleBadge role={row.changer.role} />
                    </div>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>—</span>
                  )}
                </td>

                {/* Ghi chú */}
                <td className="px-4 py-3 max-w-xs">
                  <span
                    className="line-clamp-2 text-sm"
                    style={{ color: row.notes ? "var(--text)" : "var(--muted)" }}
                  >
                    {row.notes ?? "—"}
                  </span>
                </td>

                {/* Thời gian */}
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted)" }}>
                  {formatDateTime(row.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }}>
        <PaginationNav
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
          tab="orders"
        />
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Table: Verification History
───────────────────────────────────────────────────────────────────────────── */

async function VerificationHistoryTable({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}) {
  const { data, meta, error } = await getVerificationHistory({ page, pageSize });

  if (error) {
    return (
      <p className="text-sm p-4" style={{ color: "var(--muted)" }}>
        Lỗi tải dữ liệu: {error.message}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Chưa có hoạt động"
        description="Lịch sử xác minh provider sẽ xuất hiện tại đây."
      />
    );
  }

  const rows = data as unknown as VerificationHistoryRow[];

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Tên provider", "Tên doanh nghiệp", "Kết quả", "Ghi chú", "Người duyệt", "Thời gian"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-[var(--surface)]"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>
                  {row.full_name}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                  {row.business_name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    type="verification"
                    status={row.verification_status as VerificationStatus}
                  />
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <span
                    className="line-clamp-2 text-sm"
                    style={{ color: row.verification_notes ? "var(--text)" : "var(--muted)" }}
                  >
                    {row.verification_notes ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>
                  {row.verifier?.full_name ?? "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted)" }}>
                  {formatDateTime(row.verified_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }}>
        <PaginationNav
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
          tab="verifications"
        />
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Table: Refund History
───────────────────────────────────────────────────────────────────────────── */

async function RefundHistoryTable({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}) {
  const { data, meta, error } = await getRefundHistory({ page, pageSize });

  if (error) {
    return (
      <p className="text-sm p-4" style={{ color: "var(--muted)" }}>
        Lỗi tải dữ liệu: {error.message}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Chưa có hoạt động"
        description="Lịch sử hoàn tiền sẽ xuất hiện tại đây."
      />
    );
  }

  const rows = data as unknown as RefundHistoryRow[];

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Mã đơn", "Số tiền hoàn", "Lý do", "Trạng thái", "Người duyệt", "Thời gian xử lý"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--muted)" }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-[var(--surface)]"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td className="px-4 py-3 font-mono font-medium" style={{ color: "var(--text)" }}>
                  #{row.order?.order_number ?? "—"}
                </td>
                <td className="px-4 py-3 font-semibold" style={{ color: "var(--primary)" }}>
                  {formatVND(row.refund_amount)}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <span className="line-clamp-2 text-sm" style={{ color: "var(--text)" }}>
                    {row.refund_reason}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge type="payment" status={row.status as PaymentStatus} />
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>
                  {row.approver?.full_name ?? "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--muted)" }}>
                  {formatDateTime(row.processed_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: "1px solid var(--border)" }}>
        <PaginationNav
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={meta.pageSize}
          tab="refunds"
        />
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────────────────────────────────────── */

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-12 rounded-t-none" style={{ backgroundColor: "var(--surface)" }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-14 border-t"
          style={{ borderColor: "var(--border)" }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 30;

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawTab = params.tab ?? "orders";
  const activeTab: TabKey = (["orders", "verifications", "refunds"] as TabKey[]).includes(
    rawTab as TabKey
  )
    ? (rawTab as TabKey)
    : "orders";
  const page = Math.max(1, Number(params.page ?? 1));

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Nhật ký hoạt động"
        description="Lịch sử thay đổi trạng thái đơn hàng, xác minh và hoàn tiền"
      />

      <TabNav activeTab={activeTab} />

      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <Suspense fallback={<TableSkeleton />}>
          {activeTab === "orders" && (
            <OrderHistoryTable page={page} pageSize={PAGE_SIZE} />
          )}
          {activeTab === "verifications" && (
            <VerificationHistoryTable page={page} pageSize={PAGE_SIZE} />
          )}
          {activeTab === "refunds" && (
            <RefundHistoryTable page={page} pageSize={PAGE_SIZE} />
          )}
        </Suspense>
      </div>
    </div>
  );
}
