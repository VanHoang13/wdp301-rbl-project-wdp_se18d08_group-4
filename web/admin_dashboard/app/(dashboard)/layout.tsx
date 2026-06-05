export const dynamic = "force-dynamic";

import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import DashboardShell from "@/components/dashboard/dashboard-shell";

async function checkAuth() {
  // This runs on the server to validate auth before rendering
  // Note: This is a server component wrapper, so we can't access localStorage
  // but we can check cookies which Next.js has access to
  // However, since this needs to work with client-side storage, we'll validate on client
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Sidebar uses useSearchParams — must be wrapped in Suspense */}
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>

      {/* DashboardShell is a client component that reads the Zustand store
          to dynamically apply the correct left-margin offset matching
          the sidebar width, and transitions smoothly on collapse. */}
      <DashboardShell>
        {/* Fixed top header */}
        <Header />

        {/* Page content — pushed down by the header height (64px) */}
        <main
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
          style={{ marginTop: "64px" }}
        >
          {children}
        </main>
      </DashboardShell>
    </div>
  );
}
