"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Input, Select } from "@/components/ui/input";
import type { Brand, Category } from "@/lib/types";

/** Buscador y filtros del catálogo: categoría, marca, color, talla y precio. */
export function CatalogFilters({
  brands,
  categories,
  colors,
  sizes,
}: {
  brands: Brand[];
  categories: Category[];
  colors: string[];
  sizes: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [showFilters, setShowFilters] = useState(false);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`/catalogo?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (searchParams.get("q") ?? "")) setParam("q", search);
    }, 350);
    return () => clearTimeout(t);
  }, [search, searchParams, setParam]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="pl-9"
          />
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-surface-hover sm:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filtros
        </button>
      </div>

      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-5 ${showFilters ? "" : "hidden sm:grid"}`}>
        <Select value={searchParams.get("categoria") ?? ""} onChange={(e) => setParam("categoria", e.target.value)}>
          <option value="">Categoría</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={searchParams.get("marca") ?? ""} onChange={(e) => setParam("marca", e.target.value)}>
          <option value="">Marca</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        <Select value={searchParams.get("color") ?? ""} onChange={(e) => setParam("color", e.target.value)}>
          <option value="">Color</option>
          {colors.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={searchParams.get("talla") ?? ""} onChange={(e) => setParam("talla", e.target.value)}>
          <option value="">Talla</option>
          {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={searchParams.get("precio_max") ?? ""} onChange={(e) => setParam("precio_max", e.target.value)}>
          <option value="">Precio máx.</option>
          {[500, 1000, 2000, 5000, 10000].map((p) => (
            <option key={p} value={p}>Hasta RD$ {p.toLocaleString("es-DO")}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
