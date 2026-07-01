"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import type { Brand, Category, Warehouse } from "@/lib/types";

/**
 * Gestión de catálogos base (Módulo 9): almacenes, marcas y categorías
 * con subcategorías. Altas y bajas rápidas en línea.
 */
export function CatalogManager({
  warehouses,
  brands,
  categories,
}: {
  warehouses: Warehouse[];
  brands: Brand[];
  categories: Category[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [newWarehouse, setNewWarehouse] = useState({ name: "", code: "" });
  const [newBrand, setNewBrand] = useState("");
  const [newCategory, setNewCategory] = useState({ name: "", parent_id: "" });
  const [error, setError] = useState<string | null>(null);

  const parents = categories.filter((c) => !c.parent_id);

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>) {
    setError(null);
    const { error } = await action();
    if (error) setError(error.message);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {/* Almacenes */}
      <Card>
        <CardHeader><CardTitle>Almacenes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {warehouses.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{w.name}</span>{" "}
                <span className="text-xs text-muted">({w.code})</span>
                {w.is_default && <span className="ml-2 text-xs text-brand-500">Principal</span>}
              </span>
              {!w.is_default && (
                <button
                  onClick={() => run(() => supabase.from("warehouses").delete().eq("id", w.id))}
                  className="rounded p-1 text-muted hover:text-red-600"
                  aria-label={`Eliminar ${w.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input
              value={newWarehouse.name}
              onChange={(e) => setNewWarehouse((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nombre"
              className="flex-1"
            />
            <Input
              value={newWarehouse.code}
              onChange={(e) => setNewWarehouse((f) => ({ ...f, code: e.target.value }))}
              placeholder="Código"
              className="w-24"
            />
            <Button
              size="icon"
              disabled={!newWarehouse.name || !newWarehouse.code}
              onClick={() =>
                run(() => supabase.from("warehouses").insert(newWarehouse)).then(() =>
                  setNewWarehouse({ name: "", code: "" })
                )
              }
              aria-label="Agregar almacén"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Marcas */}
      <Card>
        <CardHeader><CardTitle>Marcas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {brands.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-2 text-sm">
              <span className="font-medium">{b.name}</span>
              <button
                onClick={() => run(() => supabase.from("brands").delete().eq("id", b.id))}
                className="rounded p-1 text-muted hover:text-red-600"
                aria-label={`Eliminar ${b.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="Nueva marca"
              className="flex-1"
            />
            <Button
              size="icon"
              disabled={!newBrand}
              onClick={() =>
                run(() => supabase.from("brands").insert({ name: newBrand })).then(() => setNewBrand(""))
              }
              aria-label="Agregar marca"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categorías */}
      <Card>
        <CardHeader><CardTitle>Categorías y subcategorías</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {parents.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-2 text-sm">
                <span className="font-medium">{c.name}</span>
                <button
                  onClick={() => run(() => supabase.from("categories").delete().eq("id", c.id))}
                  className="rounded p-1 text-muted hover:text-red-600"
                  aria-label={`Eliminar ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {categories
                .filter((s) => s.parent_id === c.id)
                .map((s) => (
                  <div key={s.id} className="ml-4 mt-1 flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-muted">
                    <span>└ {s.name}</span>
                    <button
                      onClick={() => run(() => supabase.from("categories").delete().eq("id", s.id))}
                      className="rounded p-1 hover:text-red-600"
                      aria-label={`Eliminar ${s.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input
              value={newCategory.name}
              onChange={(e) => setNewCategory((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nueva categoría"
              className="flex-1"
            />
            <Select
              value={newCategory.parent_id}
              onChange={(e) => setNewCategory((f) => ({ ...f, parent_id: e.target.value }))}
              className="w-36"
            >
              <option value="">Principal</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>Sub de {p.name}</option>
              ))}
            </Select>
            <Button
              size="icon"
              disabled={!newCategory.name}
              onClick={() =>
                run(() =>
                  supabase.from("categories").insert({
                    name: newCategory.name,
                    parent_id: newCategory.parent_id || null,
                  })
                ).then(() => setNewCategory({ name: "", parent_id: "" }))
              }
              aria-label="Agregar categoría"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
