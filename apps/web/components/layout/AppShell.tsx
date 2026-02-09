"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { HouseholdSelector } from "./HouseholdSelector";
import { ScenarioSelector } from "./ScenarioSelector";
import { HouseholdProvider } from "@/contexts/HouseholdContext";
import { ScenarioProvider } from "@/contexts/ScenarioContext";
import { ToastProvider } from "@/components/ui/Toast";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <HouseholdProvider>
      <ScenarioProvider>
        <ToastProvider>
        <PreferencesProvider>
        <div className="min-h-screen flex" style={{ backgroundColor: `rgb(var(--bg-primary))`, color: `rgb(var(--text-primary))` }}>
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex-1 flex flex-col min-w-0">
            {/* Header with safe area insets */}
            <header className="h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 pt-[env(safe-area-inset-top)]" style={{ borderBottom: `1px solid rgb(var(--border-primary))` }}>
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-xl transition-colors"
                style={{ color: `rgb(var(--text-secondary))` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = `rgb(var(--text-primary))`;
                  e.currentTarget.style.backgroundColor = `rgb(var(--bg-secondary))`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = `rgb(var(--text-secondary))`;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <MenuIcon className="w-6 h-6" />
              </button>

              {/* Spacer for desktop */}
              <div className="hidden lg:block" />

              {/* Household and Scenario Selectors */}
              <div className="flex items-center gap-3">
                <HouseholdSelector />
                <ScenarioSelector />
                <NotificationBell />
              </div>
            </header>

            {/* Main content with padding for mobile nav */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
              {children}
            </main>
          </div>

          {/* Mobile bottom navigation */}
          <MobileNav />
        </div>
        </PreferencesProvider>
        </ToastProvider>
      </ScenarioProvider>
    </HouseholdProvider>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}
