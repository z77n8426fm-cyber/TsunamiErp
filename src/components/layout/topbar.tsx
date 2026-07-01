"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/lib/constants";
import type { Profile } from "@/lib/types";

/** Barra superior: menú móvil, cambio de tema, perfil y cierre de sesión. */
export function Topbar({ profile, onMenuClick }: { profile: Profile; onMenuClick: () => void }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = profile.full_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur-md lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted hover:bg-surface-hover lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Cambio de tema claro/oscuro */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label="Cambiar tema"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        {/* Perfil */}
        <div className="flex items-center gap-3 border-l border-border pl-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
            {initials}
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-tight">{profile.full_name}</p>
            <p className="text-xs text-muted">{ROLE_LABELS[profile.role]}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
