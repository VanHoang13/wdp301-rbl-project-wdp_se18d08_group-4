"use client";

import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
        };
      };
    };
  }
}

const GSI_SCRIPT = "https://accounts.google.com/gsi/client";

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
  className?: string;
}

export function GoogleSignInButton({ onCredential, disabled, className }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const initButton = useCallback(() => {
    if (!clientId || !containerRef.current || !window.google?.accounts?.id) return;
    containerRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredential(response.credential),
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      theme: "outline",
      size: "large",
      width: Math.min(containerRef.current.offsetWidth || 320, 400),
      text: "continue_with",
      locale: "vi",
    });
  }, [clientId, onCredential]);

  useEffect(() => {
    if (!clientId) return;

    const existing = document.querySelector(`script[src="${GSI_SCRIPT}"]`);
    if (existing) {
      initButton();
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SCRIPT;
    script.async = true;
    script.onload = initButton;
    document.body.appendChild(script);
  }, [clientId, initButton]);

  if (!clientId) {
    return (
      <p className="text-xs text-center text-gray-400">
        Thêm NEXT_PUBLIC_GOOGLE_CLIENT_ID vào .env.local để bật đăng nhập Google
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex justify-center w-full min-h-[44px] ${disabled ? "opacity-50 pointer-events-none" : ""} ${className ?? ""}`}
    />
  );
}
