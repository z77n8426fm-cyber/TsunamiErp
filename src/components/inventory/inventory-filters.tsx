"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Input, Select } from "@/components/ui/input";
import type { Brand, Category } from "@/lib/types";

/** Barra de búsqueda y filtros del inventario (sincronizada con la URL). */
export function InventoryFilters({
  brands,
  categories,
}: {
  brands: Brand[];
  categories: Category[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`/inventario?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Búsqueda con debounce para no recargar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (searchParams.get("q") ?? "")) setParam("q", search);
    }, 350);
    return () => clearTimeout(t);
  }, [search, searchParams, setParam]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, SKU o código de barras..."
          className="pl-9"
        />
      </div>
      <Select
        value={searchParams.get("categoria") ?? ""}
        onChange={(e) => setParam("categoria", e.target.value)}
        className="sm:w-44"
      >
        <option value="">Todas las categorías</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>
      <Select
        value={searchParams.get("marca") ?? ""}
        onChange={(e) => setParam("marca", e.target.value)}
        className="sm:w-40"
      >
        <option value="">Todas las marcas</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </Select>
      <Select
        value={searchParams.get("stock") ?? ""}
        onChange={(e) => setParam("stock", e.target.value)}
        className="sm:w-40"
      >
        <option value="">Toda existencia</option>
        <option value="bajo">Inventario bajo</option>
        <option value="agotados">Agotados</option>
      </Select>
    </div>
  );
}
