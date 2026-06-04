"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Pencil, Check, X, KeyRound, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileSectionProps {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Supabase browser client
───────────────────────────────────────────────────────────────────────────── */

function getClient() {
  return createClient();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────────── */

export function ProfileSection({
  fullName: initialName,
  email,
  avatarUrl,
  role,
}: ProfileSectionProps) {
  /* ── Name editing ── */
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(initialName);
  const [displayName, setDisplayName] = useState(initialName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [isPendingName, startNameTransition] = useTransition();

  /* ── Password change ── */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isPendingPwd, startPwdTransition] = useTransition();

  /* ── Handlers ── */

  function handleCancelName() {
    setNameValue(displayName);
    setIsEditingName(false);
    setNameError(null);
  }

  function handleSaveName() {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError("Tên không được để trống.");
      return;
    }
    startNameTransition(async () => {
      const supabase = getClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });
      if (error) {
        setNameError(error.message);
        return;
      }
      setDisplayName(trimmed);
      setIsEditingName(false);
      setNameError(null);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    });
  }

  function handleChangePassword() {
    setPasswordError(null);
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }
    startPwdTransition(async () => {
      const supabase = getClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    });
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-6"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Section heading */}
      <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
        Tài khoản Admin
      </h2>

      {/* Profile summary */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center shrink-0"
          style={{ backgroundColor: "var(--primary-tint)", border: "2px solid var(--border)" }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-7 h-7" style={{ color: "var(--primary)" }} />
          )}
        </div>
        <div>
          <p className="font-semibold text-base" style={{ color: "var(--text)" }}>
            {displayName}
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {email}
          </p>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1"
            style={{ backgroundColor: "var(--primary-tint)", color: "var(--primary)" }}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        </div>
      </div>

      {/* Name edit */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Tên hiển thị
          </label>
          {!isEditingName && (
            <button
              onClick={() => setIsEditingName(true)}
              className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--primary)" }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Chỉnh sửa tên
            </button>
          )}
        </div>

        {isEditingName ? (
          <div className="space-y-2">
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") handleCancelName();
              }}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-colors"
              style={{
                backgroundColor: "var(--bg)",
                border: "1px solid var(--primary)",
                color: "var(--text)",
              }}
              placeholder="Nhập tên mới..."
              autoFocus
            />
            {nameError && (
              <p className="text-xs" style={{ color: "#DC2626" }}>
                {nameError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveName}
                disabled={isPendingName}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors",
                  "disabled:opacity-60"
                )}
                style={{ backgroundColor: "var(--primary)" }}
              >
                <Check className="w-3.5 h-3.5" />
                {isPendingName ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                onClick={handleCancelName}
                disabled={isPendingName}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
              >
                <X className="w-3.5 h-3.5" />
                Huỷ
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text)" }}>
            {displayName || <span style={{ color: "var(--muted)" }}>Chưa đặt tên</span>}
          </p>
        )}
        {nameSuccess && (
          <p className="text-xs mt-1" style={{ color: "#16A34A" }}>
            Tên đã được cập nhật.
          </p>
        )}
      </div>

      {/* Password change */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <h3 className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Đổi mật khẩu
          </h3>
        </div>

        {/* Current password */}
        <PasswordField
          label="Mật khẩu hiện tại"
          value={currentPassword}
          onChange={setCurrentPassword}
          show={showCurrent}
          onToggleShow={() => setShowCurrent((v) => !v)}
          placeholder="Nhập mật khẩu hiện tại"
        />

        {/* New password */}
        <PasswordField
          label="Mật khẩu mới"
          value={newPassword}
          onChange={setNewPassword}
          show={showNew}
          onToggleShow={() => setShowNew((v) => !v)}
          placeholder="Tối thiểu 8 ký tự"
        />

        {/* Confirm password */}
        <PasswordField
          label="Xác nhận mật khẩu mới"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showConfirm}
          onToggleShow={() => setShowConfirm((v) => !v)}
          placeholder="Nhập lại mật khẩu mới"
        />

        {passwordError && (
          <p className="text-xs" style={{ color: "#DC2626" }}>
            {passwordError}
          </p>
        )}
        {passwordSuccess && (
          <p className="text-xs" style={{ color: "#16A34A" }}>
            Mật khẩu đã được cập nhật thành công.
          </p>
        )}

        <button
          onClick={handleChangePassword}
          disabled={isPendingPwd || !newPassword}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors",
            "disabled:opacity-60"
          )}
          style={{ backgroundColor: "var(--primary)" }}
        >
          {isPendingPwd ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Password field helper
───────────────────────────────────────────────────────────────────────────── */

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
}: PasswordFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-9 text-sm rounded-lg outline-none transition-colors"
          style={{
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
          style={{ color: "var(--muted)" }}
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
