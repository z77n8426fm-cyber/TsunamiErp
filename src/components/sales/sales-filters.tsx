"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Input, Select } from "@/components/ui/input";
import { DOC_TYPE_LABELS, SALE_STATUS_LABELS } from "@/lib/constants";

/** Filtros del listado de ventas: número, tipo de documento y estado. */
export function SalesFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`/ventas?${params.toString()}`);
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
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número de documento..."
          className="pl-9"
        />
      </div>
      <Select
        value={searchParams.get("tipo") ?? ""}
        onChange={(e) => setParam("tipo", e.target.value)}
        className="sm:w-44"
      >
        <option value="">Todos los tipos</option>
        {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>
      <Select
        value={searchParams.get("estado") ?? ""}
        onChange={(e) => setParam("estado", e.target.value)}
        className="sm:w-44"
      >
        <option value="">Todos los estados</option>
        {Object.entries(SALE_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>
    </div>
  );
}
