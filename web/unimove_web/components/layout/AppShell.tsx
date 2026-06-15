import { MobileBottomNav } from './MobileBottomNav'
import { DesktopTopNav } from './DesktopTopNav'
import { ToastRenderer } from '@/components/shared/ToastRenderer'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      {/* Desktop navigation — hidden on mobile */}
      <DesktopTopNav />

      {/* Main content */}
      <main id="main-content" className="flex-1">
        {children}
      </main>

      {/*
        Spacer so the last page section isn't hidden
        behind the fixed MobileBottomNav (64px + safe area).
        Only rendered on mobile via lg:hidden.
      */}
      <div
        className="shrink-0 lg:hidden"
        style={{ height: 'calc(var(--height-bottomnav) + env(safe-area-inset-bottom))' }}
        aria-hidden="true"
      />

      {/* Mobile navigation — hidden on desktop */}
      <MobileBottomNav />

      {/* Global toast queue */}
      <ToastRenderer />
    </div>
  )
}