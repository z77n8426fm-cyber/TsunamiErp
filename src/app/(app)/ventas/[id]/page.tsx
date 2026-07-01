import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SaleActions } from "@/components/sales/sale-actions";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import {
  DOC_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  SALE_STATUS_LABELS,
  SALE_STATUS_STYLES,
} from "@/lib/constants";
import type { CompanySettings, Customer, Payment, Sale } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Detalle de un documento de venta: líneas, totales, pagos y acciones. */
export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [saleRes, paymentsRes, settingsRes] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "*, customer:customers(*), items:sale_items(*, product:products(id, sku, name))"
      )
      .eq("id", id)
      .single(),
    supabase.from("payments").select("*").eq("sale_id", id).order("created_at", { ascending: false }),
    supabase.from("company_settings").select("*").single(),
  ]);

  const sale = saleRes.data as unknown as (Sale & { customer: Customer }) | null;
  if (!sale) notFound();

  const payments = (paymentsRes.data ?? []) as Payment[];
  const settings = settingsRes.data as CompanySettings | null;
  const pending = Number(sale.total) - Number(sale.paid_amount);

  return (
    <>
      <PageHeader
        title={sale.number}
        description={`${DOC_TYPE_LABELS[sale.doc_type]} · ${formatDateTime(sale.created_at)}`}
        actions={<SaleActions sale={sale} companyName={settings?.name ?? "TSUNAMI IMPORT, SRL"} />}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* Documento */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle del documento</CardTitle>
              <Badge className={SALE_STATUS_STYLES[sale.status]}>
                {SALE_STATUS_LABELS[sale.status]}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Producto</TH>
                    <TH className="text-right">Cantidad</TH>
                    <TH className="text-right">Precio</TH>
                    <TH className="text-right">Desc.</TH>
                    <TH className="text-right">Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {(sale.items ?? []).map((item) => (
                    <TR key={item.id}>
                      <TD>
                        <p className="font-medium">{item.product?.name ?? item.description ?? "—"}</p>
                        <p className="text-xs text-muted">{item.product?.sku}</p>
                      </TD>
                      <TD className="text-right">{formatNumber(item.quantity)}</TD>
                      <TD className="text-right">{formatCurrency(item.unit_price)}</TD>
                      <TD className="text-right text-muted">
                        {item.discount > 0 ? `−${formatCurrency(item.discount)}` : "—"}
                      </TD>
                      <TD className="text-right font-medium">{formatCurrency(item.total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>

              <div className="border-t border-border px-5 py-4">
                <dl className="ml-auto max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Subtotal</dt>
                    <dd className="font-medium">{formatCurrency(sale.subtotal)}</dd>
                  </div>
                  {Number(sale.discount_amount) > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted">Descuento ({sale.discount_percent}%)</dt>
                      <dd className="font-medium text-red-600 dark:text-red-400">
                        −{formatCurrency(sale.discount_amount)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted">{settings?.tax_name ?? "ITBIS"}</dt>
                    <dd className="font-medium">{formatCurrency(sale.tax_amount)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base">
                    <dt className="font-semibold">Total</dt>
                    <dd className="font-bold text-brand-700 dark:text-brand-300">
                      {formatCurrency(sale.total)}
                    </dd>
                  </div>
                  {sale.doc_type === "factura" && (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-muted">Pagado</dt>
                        <dd className="font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(sale.paid_amount)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Pendiente</dt>
                        <dd className={`font-semibold ${pending > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {formatCurrency(pending)}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>
            </CardContent>
          </Card>

          {/* Recibos de pago */}
          {sale.doc_type === "factura" && payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recibos de pago</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>Fecha</TH>
                      <TH>Método</TH>
                      <TH>Referencia</TH>
                      <TH className="text-right">Monto</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {payments.map((p) => (
                      <TR key={p.id}>
                        <TD className="text-muted">{formatDateTime(p.created_at)}</TD>
                        <TD>{PAYMENT_METHOD_LABELS[p.method]}</TD>
                        <TD className="text-muted">{p.reference || "—"}</TD>
                        <TD className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.amount)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cliente */}
        <Card className="h-fit">
          <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link
              href={`/clientes/${sale.customer.id}`}
              className="font-semibold hover:text-brand-600 dark:hover:text-brand-400"
            >
              {sale.customer.company || sale.customer.name}
            </Link>
            {sale.customer.company && <p className="text-muted">{sale.customer.name}</p>}
            {sale.customer.rnc && <p className="text-muted">RNC: {sale.customer.rnc}</p>}
            {sale.customer.phone && <p className="text-muted">Tel: {sale.customer.phone}</p>}
            {sale.customer.email && <p className="text-muted">{sale.customer.email}</p>}
            {sale.customer.address && (
              <p className="text-muted">
                {[sale.customer.address, sale.customer.city, sale.customer.province]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {sale.valid_until && (
              <p className="rounded-lg bg-surface-hover px-3 py-2 text-xs">
                Cotización válida hasta el <span className="font-medium">{formatDate(sale.valid_until)}</span>
              </p>
            )}
            {sale.notes && (
              <p className="rounded-lg bg-surface-hover px-3 py-2 text-xs text-muted">{sale.notes}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
