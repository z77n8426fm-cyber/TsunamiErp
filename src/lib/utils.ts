import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind resolviendo conflictos. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un monto en pesos dominicanos. */
export function formatCurrency(amount: number | null | undefined, symbol = "RD$"): string {
  const value = Number(amount ?? 0);
  return `${symbol} ${value.toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Formatea un número entero con separador de miles. */
export function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("es-DO");
}

/** Formatea una fecha ISO a formato local dominicano. */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Formatea fecha y hora. */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Genera un SKU sugerido a partir de nombre, color y talla. */
export function suggestSku(name: string, color?: string, size?: string): string {
  const part = (s: string, n: number) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, n);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return [part(name, 4), color ? part(color, 3) : null, size ? part(size, 3) : null, rand]
    .filter(Boolean)
    .join("-");
}
