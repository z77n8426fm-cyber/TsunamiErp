import Link from "next/link";
import { Plus, Ship } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";
import { IMPORT_STATUS_LABELS, IMPORT_STATUS_STYLES } from "@/lib/constants";
import type { ImportOrder } from "@/lib/types";

export const metadata = { title: "Importaciones" };
export const dynamic = "force-dynamic";

/** MÓDULO 6 — Importaciones: órdenes de compra internacionales. */
export default async function ImportsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("imports")
    .select("*, supplier:suppliers(id, name, country)")
    .order("created_at", { ascending: false })
    .limit(100);

  const imports = (data ?? []) as unknown as ImportOrder[];

  return (
    <>
      <PageHeader
        title="Importaciones"
        description="Control de órdenes de compra desde China, India y otros orígenes"
        actions={
          <Link href="/importaciones/nueva">
            <Button>
              <Plus className="h-4 w-4" /> Nueva importación
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-0">
          {imports.length === 0 ? (
            <EmptyState
              icon={Ship}
              title="Sin importaciones registradas"
              description="Registra tu primera orden de compra internacional."
              action={
                <Link href="/importaciones/nueva">
                  <Button size="sm"><Plus className="h-4 w-4" /> Nueva importación</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>PO</TH>
                  <TH>Proveedor</TH>
                  <TH>Contenedor / BL</TH>
                  <TH>ETD</TH>
                  <TH>ETA</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Costo total</TH>
                </TR>
              </THead>
              <TBody>
                {imports.map((imp) => (
                  <TR key={imp.id}>
                    <TD>
                      <Link
                        href={`/importaciones/${imp.id}`}
                        className="font-medium hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        {imp.po_number}
                      </Link>
                    </TD>
                    <TD>
                      <p>{imp.supplier?.name ?? "—"}</p>
                      <p className="text-xs text-muted">{imp.supplier?.country}</p>
                    </TD>
                    <TD className="text-muted">
                      <p>{imp.container_number || "—"}</p>
                      <p className="text-xs">{imp.bl_number}</p>
                    </TD>
                    <TD className="text-muted">{formatDate(imp.etd)}</TD>
                    <TD className="text-muted">{formatDate(imp.eta)}</TD>
                    <TD>
                      <Badge className={IMPORT_STATUS_STYLES[imp.status]}>
                        {IMPORT_STATUS_LABELS[imp.status]}
                      </Badge>
                    </TD>
                    <TD className="text-right font-semibold">
                      {imp.currency === "USD" ? "US$" : "RD$"} {Number(imp.total_cost).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                    </TD>
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
