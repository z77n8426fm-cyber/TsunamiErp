"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Profile } from "@/lib/types";

/** Estructura general de la aplicación: sidebar + topbar + contenido. */
export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar role={profile.role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Topbar profile={profile} onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl p-4 lg:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
