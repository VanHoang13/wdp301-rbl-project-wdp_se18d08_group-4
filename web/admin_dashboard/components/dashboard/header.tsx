"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Sun,
  Moon,
  Bell,
  LogOut,
  User,
} from "lucide-react";
import * as Avatar from "@radix-ui/react-avatar";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  is_read: boolean;
}

interface AdminProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
      style={{ color: "var(--muted)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
          "var(--primary-tint)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
      }}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Notification dropdown
// ---------------------------------------------------------------------------

interface NotificationDropdownProps {
  unreadCount: number;
  notifications: NotificationRow[];
  onMarkRead: () => void;
}

function NotificationDropdown({
  unreadCount,
  notifications,
  onMarkRead,
}: NotificationDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
          style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--primary-tint)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
          }}
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-0.5 text-[10px] font-bold rounded-full text-white bg-red-500">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 w-80 rounded-2xl border shadow-xl p-1 outline-none",
            "animate-in fade-in-0 zoom-in-95"
          )}
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2.5 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text)" }}
            >
              Thông báo
            </span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkRead}
                className="text-xs"
                style={{ color: "var(--primary)" }}
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div
              className="px-4 py-6 text-center text-sm"
              style={{ color: "var(--muted)" }}
            >
              Không có thông báo
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <DropdownMenu.Item
                  key={n.id}
                  className={cn(
                    "flex flex-col gap-0.5 px-3 py-2.5 rounded-xl cursor-default outline-none",
                    "focus:outline-none"
                  )}
                  style={
                    !n.is_read
                      ? { backgroundColor: "var(--primary-tint)" }
                      : undefined
                  }
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor =
                      "var(--primary-tint)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor =
                      n.is_read ? "" : "var(--primary-tint)";
                  }}
                >
                  <span
                    className="text-xs font-semibold truncate"
                    style={{ color: "var(--text)" }}
                  >
                    {n.title}
                  </span>
                  {n.body && (
                    <span
                      className="text-xs line-clamp-2"
                      style={{ color: "var(--muted)" }}
                    >
                      {n.body}
                    </span>
                  )}
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {timeAgo(n.created_at)}
                  </span>
                </DropdownMenu.Item>
              ))}
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---------------------------------------------------------------------------
// Admin avatar dropdown
// ---------------------------------------------------------------------------

interface AdminAvatarDropdownProps {
  profile: AdminProfile | null;
  onLogout: () => void;
}

function AdminAvatarDropdown({ profile, onLogout }: AdminAvatarDropdownProps) {
  const router = useRouter();
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "A";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 px-2 py-1 rounded-xl transition-colors"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--primary-tint)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
          }}
          aria-label="Admin menu"
        >
          <Avatar.Root className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            <Avatar.Image
              src={profile?.avatar_url ?? undefined}
              alt={profile?.full_name ?? "Admin"}
              className="w-full h-full object-cover"
            />
            <Avatar.Fallback
              className="w-full h-full flex items-center justify-center text-xs font-semibold text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {initials}
            </Avatar.Fallback>
          </Avatar.Root>
          <span
            className="hidden sm:block text-sm font-medium max-w-[120px] truncate"
            style={{ color: "var(--text)" }}
          >
            {profile?.full_name ?? profile?.email ?? "Admin"}
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 w-52 rounded-2xl border shadow-xl p-1 outline-none",
            "animate-in fade-in-0 zoom-in-95"
          )}
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          {profile && (
            <>
              <div className="px-3 py-2.5">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: "var(--text)" }}
                >
                  {profile.full_name ?? "Admin"}
                </p>
                {profile.email && (
                  <p
                    className="text-xs truncate mt-0.5"
                    style={{ color: "var(--muted)" }}
                  >
                    {profile.email}
                  </p>
                )}
              </div>
              <DropdownMenu.Separator
                className="my-1 h-px mx-1"
                style={{ backgroundColor: "var(--border)" }}
              />
            </>
          )}

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer outline-none"
            style={{ color: "var(--text)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "var(--primary-tint)";
              (e.currentTarget as HTMLDivElement).style.color =
                "var(--primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
              (e.currentTarget as HTMLDivElement).style.color = "var(--text)";
            }}
            onSelect={() => router.push("/settings")}
          >
            <User size={15} />
            Hồ sơ
          </DropdownMenu.Item>

          <DropdownMenu.Separator
            className="my-1 h-px mx-1"
            style={{ backgroundColor: "var(--border)" }}
          />

          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer outline-none text-red-500"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor =
                "#FEE2E2";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
            }}
            onSelect={onLogout}
          >
            <LogOut size={15} />
            Đăng xuất
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---------------------------------------------------------------------------
// Main Header component
// ---------------------------------------------------------------------------

export default function Header() {
  const router = useRouter();
  const { toggleCollapsed, setMobileOpen } = useSidebarStore();
  const supabase = createClient();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [searchValue, setSearchValue] = useState("");

  // Fetch current admin profile
  const fetchProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, email")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile({
        id: data.id as string,
        full_name: (data.full_name as string | null) ?? null,
        avatar_url: (data.avatar_url as string | null) ?? null,
        email: user.email ?? null,
      });
    }
  }, [supabase]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, created_at, is_read")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      const rows = data as NotificationRow[];
      setNotifications(rows);
      setUnreadCount(rows.filter((n) => !n.is_read).length);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
    fetchNotifications();
  }, [fetchProfile, fetchNotifications]);

  const handleMarkRead = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [supabase]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/login");
  }, [supabase, router]);

  return (
    <header
      className="fixed top-0 right-0 left-0 z-20 flex items-center gap-3 px-4 border-b"
      style={{
        height: "64px",
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Left: hamburger / collapse toggle */}
      <button
        className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors shrink-0"
        style={{ color: "var(--muted)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "var(--primary-tint)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
        }}
        onClick={() => {
          // On mobile: open drawer; on desktop: collapse sidebar
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            setMobileOpen(true);
          } else {
            toggleCollapsed();
          }
        }}
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Center: search */}
      <div className="flex-1 flex items-center max-w-sm">
        <div className="relative w-full">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--muted)" }}
          >
            <Search size={15} />
          </span>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full h-9 pl-9 pr-4 text-sm rounded-full border outline-none transition-colors"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor =
                "var(--primary)";
              (e.currentTarget as HTMLInputElement).style.boxShadow =
                "0 0 0 2px var(--primary-tint)";
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor =
                "var(--border)";
              (e.currentTarget as HTMLInputElement).style.boxShadow = "";
            }}
          />
        </div>
      </div>

      {/* Right: actions */}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />

        <NotificationDropdown
          unreadCount={unreadCount}
          notifications={notifications}
          onMarkRead={handleMarkRead}
        />

        <AdminAvatarDropdown profile={profile} onLogout={handleLogout} />
      </div>
    </header>
  );
}
