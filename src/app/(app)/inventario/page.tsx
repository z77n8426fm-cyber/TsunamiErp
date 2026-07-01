import Link from "next/link";
import Image from "next/image";
import { ArrowLeftRight, Package, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Brand, Category, Product } from "@/lib/types";

export const metadata = { title: "Inventario" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

interface SearchParams {
  q?: string;
  categoria?: string;
  marca?: string;
  stock?: string; // "agotados" | "bajo"
  page?: string;
}

/** MÓDULO 2 — Inventario: listado de productos con existencias y filtros. */
export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      "id, sku, name, color, size, min_stock, total_cost, wholesale_price, brand:brands(id, name), category:categories!products_category_id_fkey(id, name), images:product_images(url, is_primary), stock:inventory_stock(quantity, warehouse_id)",
      { count: "exact" }
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,sku.ilike.%${params.q}%,barcode.ilike.%${params.q}%`);
  }
  if (params.categoria) query = query.eq("category_id", params.categoria);
  if (params.marca) query = query.eq("brand_id", params.marca);

  const [{ data, count }, brandsRes, categoriesRes] = await Promise.all([
    query,
    supabase.from("brands").select("id, name").eq("is_active", true).order("name"),
    supabase.from("categories").select("id, name, parent_id").eq("is_active", true).is("parent_id", null).order("name"),
  ]);

  let products = (data ?? []) as unknown as Product[];

  // Filtro por nivel de existencias (calculado sobre los almacenes)
  const totalQty = (p: Product) => (p.stock ?? []).reduce((sum, s) => sum + s.quantity, 0);
  if (params.stock === "agotados") products = products.filter((p) => totalQty(p) === 0);
  if (params.stock === "bajo") products = products.filter((p) => totalQty(p) > 0 && totalQty(p) <= p.min_stock);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Inventario"
        description={`${formatNumber(count ?? 0)} productos registrados`}
        actions={
          <>
            <Link href="/inventario/movimientos">
              <Button variant="outline">
                <ArrowLeftRight className="h-4 w-4" />
                Movimientos
              </Button>
            </Link>
            <Link href="/inventario/nuevo">
              <Button>
                <Plus className="h-4 w-4" />
                Nuevo producto
              </Button>
            </Link>
          </>
        }
      />

      <InventoryFilters
        brands={(brandsRes.data ?? []) as Brand[]}
        categories={(categoriesRes.data ?? []) as Category[]}
      />

      <Card className="mt-4">
        <CardContent className="p-0">
          {products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No hay productos"
              description="Registra tu primer producto para comenzar a controlar el inventario."
              action={
                <Link href="/inventario/nuevo">
                  <Button size="sm">
                    <Plus className="h-4 w-4" /> Nuevo producto
                  </Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Producto</TH>
                  <TH>Categoría</TH>
                  <TH>Variante</TH>
                  <TH className="text-right">Costo</TH>
                  <TH className="text-right">Precio mayor</TH>
                  <TH className="text-right">Existencia</TH>
                  <TH>Estado</TH>
                </TR>
              </THead>
              <TBody>
                {products.map((p) => {
                  const qty = totalQty(p);
                  const primaryImage =
                    p.images?.find((i) => i.is_primary)?.url ?? p.images?.[0]?.url;
                  return (
                    <TR key={p.id}>
                      <TD>
                        <Link href={`/inventario/${p.id}`} className="flex items-center gap-3 group">
                          {primaryImage ? (
                            <Image
                              src={primaryImage}
                              alt={p.name}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-lg border border-border object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover">
                              <Package className="h-5 w-5 text-muted" />
                            </span>
                          )}
                          <span>
                            <span className="block font-medium group-hover:text-brand-600 dark:group-hover:text-brand-400">
                              {p.name}
                            </span>
                            <span className="block text-xs text-muted">{p.sku}</span>
                          </span>
                        </Link>
                      </TD>
                      <TD className="text-muted">{p.category?.name ?? "—"}</TD>
                      <TD className="text-muted">
                        {[p.color, p.size].filter(Boolean).join(" / ") || "—"}
                      </TD>
                      <TD className="text-right">{formatCurrency(p.total_cost)}</TD>
                      <TD className="text-right font-medium">{formatCurrency(p.wholesale_price)}</TD>
                      <TD className="text-right font-semibold">{formatNumber(qty)}</TD>
                      <TD>
                        {qty === 0 ? (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400">
                            Agotado
                          </Badge>
                        ) : qty <= p.min_stock ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                            Bajo
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400">
                            Disponible
                          </Badge>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/inventario?${new URLSearchParams({ ...params, page: String(page - 1) })}`}>
              <Button variant="outline" size="sm">Anterior</Button>
            </Link>
          )}
          <span className="text-sm text-muted">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/inventario?${new URLSearchParams({ ...params, page: String(page + 1) })}`}>
              <Button variant="outline" size="sm">Siguiente</Button>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
