import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductGallery } from "@/components/inventory/product-gallery";
import { ProductCodes } from "@/components/inventory/product-codes";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { MOVEMENT_LABELS, MOVEMENT_STYLES } from "@/lib/constants";
import type { InventoryMovement, Product, Warehouse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Ficha completa del producto: datos, costos, existencias y movimientos. */
export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [productRes, movementsRes, warehousesRes] = await Promise.all([
    supabase
      .from("products")
      .select(
        "*, brand:brands(id, name), category:categories!products_category_id_fkey(id, name), subcategory:categories!products_subcategory_id_fkey(id, name), supplier:suppliers(id, name, country), images:product_images(*), stock:inventory_stock(quantity, warehouse_id)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("inventory_movements")
      .select("*, warehouse:warehouses!inventory_movements_warehouse_id_fkey(id, name)")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("warehouses").select("*").eq("is_active", true),
  ]);

  const product = productRes.data as unknown as Product | null;
  if (!product) notFound();

  const movements = (movementsRes.data ?? []) as unknown as InventoryMovement[];
  const warehouses = (warehousesRes.data ?? []) as Warehouse[];
  const totalQty = (product.stock ?? []).reduce((sum, s) => sum + s.quantity, 0);

  const attrs: [string, string | null | undefined][] = [
    ["SKU", product.sku],
    ["Código de barras", product.barcode],
    ["Marca", product.brand?.name],
    ["Categoría", product.category?.name],
    ["Subcategoría", product.subcategory?.name],
    ["Color", product.color],
    ["Talla", product.size],
    ["Material", product.material],
    ["País de origen", product.country_of_origin],
    ["Proveedor", product.supplier?.name],
  ];

  return (
    <>
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku}`}
        actions={
          <Link href={`/inventario/${product.id}/editar`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <ProductGallery images={product.images ?? []} videoUrl={product.video_url} name={product.name} />
          <ProductCodes sku={product.sku} barcode={product.barcode} />
        </div>

        <div className="space-y-4 xl:col-span-2">
          {/* Atributos */}
          <Card>
            <CardHeader><CardTitle>Información del producto</CardTitle></CardHeader>
            <CardContent>
              {product.description && <p className="mb-4 text-sm text-muted">{product.description}</p>}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {attrs.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Costos y precios */}
          <Card>
            <CardHeader><CardTitle>Costos y precios</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                ["Costo FOB", product.fob_cost],
                ["Gastos importación", product.import_expenses],
                ["Costo total", product.total_cost],
                ["Precio sugerido", product.suggested_price],
                ["Precio por mayor", product.wholesale_price],
                ["Precio por unidad", product.retail_price],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg bg-surface-hover px-3 py-2.5">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-0.5 font-semibold">{formatCurrency(value as number)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Existencias por almacén */}
          <Card>
            <CardHeader>
              <CardTitle>Existencias por almacén</CardTitle>
              <Badge
                className={
                  totalQty === 0
                    ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400"
                    : totalQty <= product.min_stock
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400"
                }
              >
                Total: {formatNumber(totalQty)} unidades
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Almacén</TH>
                    <TH className="text-right">Cantidad</TH>
                    <TH className="text-right">Valor</TH>
                  </TR>
                </THead>
                <TBody>
                  {warehouses.map((w) => {
                    const qty = product.stock?.find((s) => s.warehouse_id === w.id)?.quantity ?? 0;
                    return (
                      <TR key={w.id}>
                        <TD className="font-medium">{w.name}</TD>
                        <TD className="text-right">{formatNumber(qty)}</TD>
                        <TD className="text-right">{formatCurrency(qty * product.total_cost)}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </CardContent>
          </Card>

          {/* Historial de movimientos */}
          <Card>
            <CardHeader><CardTitle>Historial de movimientos</CardTitle></CardHeader>
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <EmptyState title="Sin movimientos" description="Este producto aún no tiene entradas ni salidas." />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Tipo</TH>
                      <TH>Almacén</TH>
                      <TH className="text-right">Cantidad</TH>
                      <TH>Referencia</TH>
                      <TH>Fecha</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {movements.map((m) => (
                      <TR key={m.id}>
                        <TD>
                          <Badge className={MOVEMENT_STYLES[m.type]}>{MOVEMENT_LABELS[m.type]}</Badge>
                        </TD>
                        <TD>{m.warehouse?.name ?? "—"}</TD>
                        <TD className="text-right font-medium">{formatNumber(m.quantity)}</TD>
                        <TD className="text-muted">{m.reference || "—"}</TD>
                        <TD className="text-xs text-muted">{formatDateTime(m.created_at)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
