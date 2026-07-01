import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DOC_TYPE_LABELS, SALE_STATUS_LABELS, SALE_STATUS_STYLES } from "@/lib/constants";
import { DollarSign, FileText, Receipt } from "lucide-react";
import type { Customer, Sale } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Ficha del cliente: datos de contacto, historial y balance (Módulo 4). */
export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [customerRes, salesRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase
      .from("sales")
      .select("id, number, doc_type, status, total, paid_amount, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const customer = customerRes.data as Customer | null;
  if (!customer) notFound();

  const sales = (salesRes.data ?? []) as Sale[];
  const invoices = sales.filter((s) => s.doc_type === "factura" && s.status !== "cancelado");
  const quotes = sales.filter((s) => s.doc_type === "cotizacion");
  const totalPurchases = invoices.reduce((sum, s) => sum + Number(s.total), 0);
  const balance = invoices.reduce((sum, s) => sum + (Number(s.total) - Number(s.paid_amount)), 0);

  const contacts = [
    { icon: Phone, label: customer.phone, href: customer.phone ? `tel:${customer.phone}` : null },
    {
      icon: MessageCircle,
      label: customer.whatsapp,
      href: customer.whatsapp ? `https://wa.me/${customer.whatsapp.replace(/\D/g, "")}` : null,
    },
    { icon: Mail, label: customer.email, href: customer.email ? `mailto:${customer.email}` : null },
    {
      icon: Instagram,
      label: customer.instagram,
      href: customer.instagram
        ? `https://instagram.com/${customer.instagram.replace("@", "")}`
        : null,
    },
  ].filter((c) => c.label);

  return (
    <>
      <PageHeader
        title={customer.name}
        description={customer.company ?? undefined}
        actions={
          <>
            <Link href={`/ventas/nueva?cliente=${customer.id}`}>
              <Button variant="outline">
                <ShoppingCart className="h-4 w-4" /> Nueva venta
              </Button>
            </Link>
            <Link href={`/clientes/${customer.id}/editar`}>
              <Button>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total comprado" value={formatCurrency(totalPurchases)} icon={DollarSign} tone="success" />
        <StatCard
          title="Balance pendiente"
          value={formatCurrency(balance)}
          icon={Receipt}
          tone={balance > 0 ? "danger" : "default"}
        />
        <StatCard title="Documentos" value={`${invoices.length} facturas · ${quotes.length} cotizaciones`} icon={FileText} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Datos de contacto */}
        <Card>
          <CardHeader><CardTitle>Información de contacto</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {contacts.length === 0 && <p className="text-sm text-muted">Sin datos de contacto.</p>}
            {contacts.map((c, i) => (
              <a
                key={i}
                href={c.href ?? "#"}
                target={c.href?.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-hover"
              >
                <c.icon className="h-4 w-4 shrink-0 text-brand-500" />
                <span className="font-medium">{c.label}</span>
              </a>
            ))}

            {(customer.address || customer.city || customer.province) && (
              <div className="flex items-start gap-3 px-2 py-1.5 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <span>
                  {[customer.address, customer.city, customer.province, customer.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}

            <div className="border-t border-border pt-3 text-sm">
              <p className="text-muted">RNC: <span className="font-medium text-foreground">{customer.rnc || "—"}</span></p>
              <p className="mt-1 text-muted">
                Límite de crédito:{" "}
                <span className="font-medium text-foreground">{formatCurrency(customer.credit_limit)}</span>
              </p>
              <p className="mt-1 text-muted">Cliente desde: <span className="font-medium text-foreground">{formatDate(customer.created_at)}</span></p>
            </div>

            {customer.notes && (
              <p className="rounded-lg bg-surface-hover px-3 py-2 text-sm text-muted">{customer.notes}</p>
            )}
          </CardContent>
        </Card>

        {/* Historial de documentos */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Historial de compras y cotizaciones</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sales.length === 0 ? (
              <EmptyState
                title="Sin historial"
                description="Este cliente aún no tiene cotizaciones ni facturas."
                action={
                  <Link href={`/ventas/nueva?cliente=${customer.id}`}>
                    <Button size="sm"><Plus className="h-4 w-4" /> Crear cotización</Button>
                  </Link>
                }
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Documento</TH>
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
                        <TD className="text-muted">{DOC_TYPE_LABELS[s.doc_type]}</TD>
                        <TD>
                          <Badge className={SALE_STATUS_STYLES[s.status]}>
                            {SALE_STATUS_LABELS[s.status]}
                          </Badge>
                        </TD>
                        <TD className="text-muted">{formatDate(s.created_at)}</TD>
                        <TD className="text-right font-medium">{formatCurrency(s.total)}</TD>
                        <TD className={`text-right ${s.doc_type === "factura" && pending > 0 ? "font-semibold text-red-600 dark:text-red-400" : "text-muted"}`}>
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
      </div>
    </>
  );
}
