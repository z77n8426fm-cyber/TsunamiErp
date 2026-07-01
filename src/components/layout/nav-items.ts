import {
  LayoutDashboard,
  Package,
  BookImage,
  Users,
  ShoppingCart,
  Ship,
  BarChart3,
  UserCog,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles con acceso; undefined = todos. */
  roles?: UserRole[];
}

/** Menú lateral del ERP: un módulo por entrada. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inventario", href: "/inventario", icon: Package, roles: ["admin", "gerente", "almacen", "contabilidad"] },
  { label: "Catálogo", href: "/catalogo", icon: BookImage },
  { label: "Clientes", href: "/clientes", icon: Users, roles: ["admin", "gerente", "ventas", "contabilidad"] },
  { label: "Ventas", href: "/ventas", icon: ShoppingCart, roles: ["admin", "gerente", "ventas", "contabilidad"] },
  { label: "Importaciones", href: "/importaciones", icon: Ship, roles: ["admin", "gerente", "contabilidad"] },
  { label: "Reportes", href: "/reportes", icon: BarChart3, roles: ["admin", "gerente", "contabilidad"] },
  { label: "Asistente IA", href: "/asistente", icon: Sparkles },
  { label: "Usuarios", href: "/usuarios", icon: UserCog, roles: ["admin"] },
  { label: "Configuración", href: "/configuracion", icon: Settings, roles: ["admin", "gerente"] },
];
