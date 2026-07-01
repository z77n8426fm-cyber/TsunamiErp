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
import { ReceiveImportButton } from "@/components/imports/receive-import-button";
import { formatDate, formatNumber } from "@/lib/utils";
import { IMPORT_STATUS_LABELS, IMPORT_STATUS_STYLES } from "@/lib/constants";
import type { ImportOrder, Warehouse } from "@/lib/types";

export const dynamic = "force-dynamic";

const money = (value: number, currency: string) =>
  `${currency === "USD" ? "US$" : "RD$"} ${Number(value).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

/** Detalle de una importación: logística, costos, productos y recepción. */
export default async function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [importRes, warehousesRes] = await Promise.all([
    supabase
      .from("imports")
      .select("*, supplier:suppliers(id, name, country), items:import_items(*, product:products(id, sku, name))")
      .eq("id", id)
      .single(),
    supabase.from("warehouses").select("*").eq("is_active", true).order("name"),
  ]);

  const imp = importRes.data as unknown as ImportOrder | null;
  if (!imp) notFound();

  const warehouses = (warehousesRes.data ?? []) as Warehouse[];
  const totalUnits = (imp.items ?? []).reduce((sum, i) => sum + i.quantity, 0);

  const logistics: [string, string | null][] = [
    ["Factura comercial", imp.commercial_invoice],
    ["Packing list", imp.packing_list],
    ["BL", imp.bl_number],
    ["Contenedor", imp.container_number],
    ["Puerto", imp.port],
    ["Naviera", imp.shipping_line],
    ["ETD", imp.etd ? formatDate(imp.etd) : null],
    ["ETA", imp.eta ? formatDate(imp.eta) : null],
  ];

  const costs: [string, number][] = [
    ["Costo FOB", imp.fob_cost],
    ["Flete", imp.freight_cost],
    ["Seguro", imp.insurance_cost],
    ["Aduanas", imp.customs_cost],
    ["Otros", imp.other_costs],
  ];

  return (
    <>
      <PageHeader
        title={imp.po_number}
        description={`Proveedor: ${imp.supplier?.name ?? "—"} ${imp.supplier?.country ? `(${imp.supplier.country})` : ""}`}
        actions={
          <>
            {imp.status !== "recibida" && imp.status !== "cancelada" && (
              <ReceiveImportButton importOrder={imp} warehouses={warehouses} />
            )}
            <Link href={`/importaciones/${imp.id}/editar`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Información logística</CardTitle>
              <Badge className={IMPORT_STATUS_STYLES[imp.status]}>
                {IMPORT_STATUS_LABELS[imp.status]}
              </Badge>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                {logistics.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
              {imp.notes && (
                <p className="mt-4 rounded-lg bg-surface-hover px-3 py-2 text-sm text-muted">{imp.notes}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos ({formatNumber(totalUnits)} unidades)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(imp.items ?? []).length === 0 ? (
                <EmptyState title="Sin productos" description="Edita la importación para agregar productos." />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Producto</TH>
                      <TH className="text-right">Cantidad</TH>
                      <TH className="text-right">FOB unitario</TH>
                      <TH className="text-right">Total</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {(imp.items ?? []).map((item) => (
                      <TR key={item.id}>
                        <TD>
                          <p className="font-medium">{item.product?.name ?? "—"}</p>
                          <p className="text-xs text-muted">{item.product?.sku}</p>
                        </TD>
                        <TD className="text-right">{formatNumber(item.quantity)}</TD>
                        <TD className="text-right">{money(item.unit_fob_cost, imp.currency)}</TD>
                        <TD className="text-right font-medium">{money(item.total, imp.currency)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle>Costos de importación</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {costs.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted">{label}</span>
                <span className="font-medium">{money(value, imp.currency)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold">Costo final</span>
              <span className="text-lg font-bold text-brand-700 dark:text-brand-300">
                {money(imp.total_cost, imp.currency)}
              </span>
            </div>
            {totalUnits > 0 && (
              <p className="rounded-lg bg-surface-hover px-3 py-2 text-xs text-muted">
                Costo promedio por unidad:{" "}
                <span className="font-semibold text-foreground">
                  {money(Number(imp.total_cost) / totalUnits, imp.currency)}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
