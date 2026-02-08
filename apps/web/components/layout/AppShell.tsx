"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { HouseholdSelector } from "./HouseholdSelector";
import { ScenarioSelector } from "./ScenarioSelector";
import { HouseholdProvider } from "@/contexts/HouseholdContext";
import { ScenarioProvider } from "@/contexts/ScenarioContext";
import { ToastProvider } from "@/components/ui/Toast";
import { PreferencesProvider } from "@/contexts/PreferencesContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <HouseholdProvider>
      <ScenarioProvider>
        <ToastProvider>
        <PreferencesProvider>
        <div className="min-h-screen bg-zinc-950 text-zinc-50 flex">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 lg:px-6 shrink-0">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-xl text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors"
              >
                <MenuIcon className="w-6 h-6" />
              </button>

              {/* Spacer for desktop */}
              <div className="hidden lg:block" />

              {/* Household and Scenario Selectors */}
              <div className="flex items-center gap-3">
                <HouseholdSelector />
                <ScenarioSelector />
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              {children}
            </main>
          </div>
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
