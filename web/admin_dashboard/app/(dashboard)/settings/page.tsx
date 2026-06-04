export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { createClient } from "@/lib/supabase/server";

import { ProfileSection } from "./profile-section";
import { ThemeSection } from "./theme-section";
import { PlatformSettingsSection } from "./platform-settings-section";
import { DangerZoneSection } from "./danger-zone-section";

/* ─────────────────────────────────────────────────────────────────────────────
   Known platform_settings keys
───────────────────────────────────────────────────────────────────────────── */

export type PlatformSetting = {
  key: string;
  value: string;
  label: string;
  description: string;
};

const KNOWN_KEYS: Omit<PlatformSetting, "value">[] = [
  {
    key: "platform_name",
    label: "Tên nền tảng",
    description: "Tên hiển thị của nền tảng UniMove",
  },
  {
    key: "commission_rate",
    label: "Tỷ lệ hoa hồng (%)",
    description: "Phần trăm hoa hồng nền tảng thu trên mỗi đơn hàng",
  },
  {
    key: "support_email",
    label: "Email hỗ trợ",
    description: "Địa chỉ email nhận yêu cầu hỗ trợ từ người dùng",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Page (Server Component)
───────────────────────────────────────────────────────────────────────────── */

export default async function SettingsPage() {
  const supabase = await createClient();

  /* Auth check */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /* Admin profile from public.profiles */
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role")
    .eq("id", user.id)
    .single();

  /* Platform settings */
  const { data: rawSettings } = await supabase
    .from("platform_settings")
    .select("key, value");

  const settingsMap: Record<string, string> = {};
  if (rawSettings) {
    for (const row of rawSettings as { key: string; value: string }[]) {
      settingsMap[row.key] = row.value;
    }
  }

  const platformSettings: PlatformSetting[] = KNOWN_KEYS.map((k) => ({
    ...k,
    value: settingsMap[k.key] ?? "",
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Cài đặt"
        description="Quản lý tài khoản, giao diện và thông tin hệ thống"
      />

      <div className="space-y-6">
        {/* 1. Admin account */}
        <ProfileSection
          userId={user.id}
          fullName={profile?.full_name ?? user.user_metadata?.full_name ?? ""}
          email={profile?.email ?? user.email ?? ""}
          avatarUrl={profile?.avatar_url ?? null}
          role={profile?.role ?? "admin"}
        />

        {/* 2. Theme */}
        <ThemeSection />

        {/* 3. Platform settings */}
        <PlatformSettingsSection settings={platformSettings} />

        {/* 4. Danger zone */}
        <DangerZoneSection />
      </div>
    </div>
  );
}
