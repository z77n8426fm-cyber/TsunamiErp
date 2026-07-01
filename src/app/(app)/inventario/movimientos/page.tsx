import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { MovementForm } from "@/components/inventory/movement-form";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { MOVEMENT_LABELS, MOVEMENT_STYLES } from "@/lib/constants";
import type { InventoryMovement, Warehouse } from "@/lib/types";

export const metadata = { title: "Movimientos de inventario" };
export const dynamic = "force-dynamic";

/** Entradas, salidas, ajustes y transferencias entre almacenes. */
export default async function MovementsPage() {
  const supabase = await createClient();

  const [movementsRes, warehousesRes, productsRes] = await Promise.all([
    supabase
      .from("inventory_movements")
      .select(
        "*, product:products(id, sku, name), warehouse:warehouses!inventory_movements_warehouse_id_fkey(id, name)"
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("warehouses").select("*").eq("is_active", true).order("name"),
    supabase.from("products").select("id, sku, name").eq("is_active", true).order("name").limit(1000),
  ]);

  const movements = (movementsRes.data ?? []) as unknown as InventoryMovement[];
  const warehouses = (warehousesRes.data ?? []) as Warehouse[];

  return (
    <>
      <PageHeader
        title="Movimientos de inventario"
        description="Entradas, salidas, ajustes y transferencias entre almacenes"
        actions={<MovementForm warehouses={warehouses} products={productsRes.data ?? []} />}
      />

      <Card>
        <CardContent className="p-0">
          {movements.length === 0 ? (
            <EmptyState
              title="Sin movimientos registrados"
              description="Registra una entrada para agregar existencias a tu inventario."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Producto</TH>
                  <TH>Tipo</TH>
                  <TH>Almacén</TH>
                  <TH className="text-right">Cantidad</TH>
                  <TH>Referencia</TH>
                  <TH>Notas</TH>
                  <TH>Fecha</TH>
                </TR>
              </THead>
              <TBody>
                {movements.map((m) => (
                  <TR key={m.id}>
                    <TD>
                      <p className="font-medium">{m.product?.name ?? "—"}</p>
                      <p className="text-xs text-muted">{m.product?.sku}</p>
                    </TD>
                    <TD>
                      <Badge className={MOVEMENT_STYLES[m.type]}>{MOVEMENT_LABELS[m.type]}</Badge>
                    </TD>
                    <TD>{m.warehouse?.name ?? "—"}</TD>
                    <TD className="text-right font-semibold">{formatNumber(m.quantity)}</TD>
                    <TD className="text-muted">{m.reference || "—"}</TD>
                    <TD className="max-w-48 truncate text-muted">{m.notes || "—"}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted">{formatDateTime(m.created_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
