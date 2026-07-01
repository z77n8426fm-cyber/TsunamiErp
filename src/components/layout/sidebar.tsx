"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Waves, X } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Panel lateral de navegación.
 * En escritorio es fijo; en móvil/tablet se abre como drawer con overlay.
 */
export function Sidebar({
  role,
  open,
  onClose,
}: {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-950 text-white transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/20">
              <Waves className="h-5 w-5 text-brand-300" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-wide">TSUNAMI</span>
              <span className="block text-[10px] font-medium uppercase tracking-widest text-brand-300">
                Import ERP
              </span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-300 hover:bg-white/10 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-brand-200/80 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[11px] text-brand-300/60">
            TSUNAMI IMPORT, SRL
            <br />© {new Date().getFullYear()} — Sistema interno
          </p>
        </div>
      </aside>
    </>
  );
}
