import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeInit } from "@/components/shared/theme-init";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
  variable: "--font-mono-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UniMove - Chuyển trọ & Chợ sinh viên",
  description: "Nền tảng chuyển đồ và mua bán đồ dùng sinh viên",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563EB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeInit />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
