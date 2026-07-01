import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SalesFilters } from "@/components/sales/sales-filters";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { DOC_TYPE_LABELS, SALE_STATUS_LABELS, SALE_STATUS_STYLES } from "@/lib/constants";
import type { Sale } from "@/lib/types";

export const metadata = { title: "Ventas" };
export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  tipo?: string;
  estado?: string;
  page?: string;
}

const PAGE_SIZE = 25;

/** MÓDULO 5 — Ventas: cotizaciones, pedidos y facturas. */
export default async function SalesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const supabase = await createClient();

  let query = supabase
    .from("sales")
    .select("*, customer:customers(id, name, company)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (params.q) query = query.ilike("number", `%${params.q}%`);
  if (params.tipo) query = query.eq("doc_type", params.tipo);
  if (params.estado) query = query.eq("status", params.estado);

  const { data, count } = await query;
  const sales = (data ?? []) as unknown as Sale[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Ventas"
        description={`${formatNumber(count ?? 0)} documentos`}
        actions={
          <Link href="/ventas/nueva">
            <Button>
              <Plus className="h-4 w-4" /> Nueva venta
            </Button>
          </Link>
        }
      />

      <SalesFilters />

      <Card className="mt-4">
        <CardContent className="p-0">
          {sales.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No hay documentos de venta"
              description="Crea tu primera cotización, pedido o factura."
              action={
                <Link href="/ventas/nueva">
                  <Button size="sm"><Plus className="h-4 w-4" /> Nueva venta</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Documento</TH>
                  <TH>Cliente</TH>
                  <TH>Tipo</TH>
                  <TH>Estado</TH>
                  <TH>Fecha</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Pendiente</TH>
                </TR>
              </THead>
              <TBody>
                {sales.map((s) => {
                  const pending = Number(s.total) - Number(s.paid_amount);
                  return (
                    <TR key={s.id}>
                      <TD>
                        <Link
                          href={`/ventas/${s.id}`}
                          className="font-medium hover:text-brand-600 dark:hover:text-brand-400"
                        >
                          {s.number}
                        </Link>
                      </TD>
                      <TD>{s.customer?.company || s.customer?.name || "—"}</TD>
                      <TD className="text-muted">{DOC_TYPE_LABELS[s.doc_type]}</TD>
                      <TD>
                        <Badge className={SALE_STATUS_STYLES[s.status]}>
                          {SALE_STATUS_LABELS[s.status]}
                        </Badge>
                      </TD>
                      <TD className="text-muted">{formatDate(s.created_at)}</TD>
                      <TD className="text-right font-semibold">{formatCurrency(s.total)}</TD>
                      <TD className={`text-right ${s.doc_type === "factura" && pending > 0 ? "font-medium text-red-600 dark:text-red-400" : "text-muted"}`}>
                        {s.doc_type === "factura" ? formatCurrency(pending) : "—"}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/ventas?${new URLSearchParams({ ...params, page: String(page - 1) })}`}>
              <Button variant="outline" size="sm">Anterior</Button>
            </Link>
          )}
          <span className="text-sm text-muted">Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Link href={`/ventas?${new URLSearchParams({ ...params, page: String(page + 1) })}`}>
              <Button variant="outline" size="sm">Siguiente</Button>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
