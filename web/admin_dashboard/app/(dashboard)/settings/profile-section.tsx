"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";

interface ProfileSectionProps {
  userId?: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string | null;
  role?: string;
}

export function ProfileSection({
  fullName: initialName = "",
  email: initialEmail = "",
  avatarUrl: initialAvatar = null,
  role: initialRole = "admin",
}: ProfileSectionProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [role, setRole] = useState(initialRole);

  // Load from localStorage on mount if props not provided
  useEffect(() => {
    if (!initialName || !initialEmail) {
      const userStr = localStorage.getItem('admin_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.full_name) setDisplayName(user.full_name);
          if (user.email) setEmail(user.email);
          if (user.role) setRole(user.role);
        } catch (e) {
          console.error('Failed to parse admin_user from localStorage', e);
        }
      }
    }
  }, [initialName, initialEmail]);

  return (
    <div
      className="rounded-2xl p-6 space-y-4"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
        Hồ sơ admin
      </h2>

      {/* Profile Info */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--primary-tint)" }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
          ) : (
            <User className="w-7 h-7" style={{ color: "var(--primary)" }} />
          )}
        </div>
        <div>
          <p className="font-semibold text-base" style={{ color: "var(--text)" }}>
            {displayName || "Admin"}
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {email || "No email"}
          </p>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1"
            style={{ backgroundColor: "var(--primary-tint)", color: "var(--primary)" }}
          >
            {role && role.charAt ? role.charAt(0).toUpperCase() + role.slice(1) : "Admin"}
          </span>
        </div>
      </div>

      <p className="text-xs" style={{ color: "var(--muted)" }}>
        Sử dụng JWT token authentication. Cập nhật hồ sơ qua backend API.
      </p>
    </div>
  );
}
