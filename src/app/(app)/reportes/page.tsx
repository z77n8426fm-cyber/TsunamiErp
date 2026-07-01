import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportButtons } from "@/components/reports/export-buttons";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DollarSign, Percent, TrendingUp, Warehouse } from "lucide-react";
import type { ProductStock, TopProduct } from "@/lib/types";

export const metadata = { title: "Reportes" };
export const dynamic = "force-dynamic";

interface SaleRow {
  id: string;
  number: string;
  total: number;
  created_at: string;
  customer: { name: string; company: string | null } | null;
  items: { quantity: number; total: number; product: { total_cost: number } | null }[];
}

/**
 * MÓDULO 7 — Reportes: ventas, ganancias, inventario, productos más
 * vendidos y lentos. Todo exportable a Excel (CSV) y PDF (impresión).
 */
export default async function ReportsPage() {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [invoicesRes, stockRes, topRes, customersRes] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "id, number, total, created_at, customer:customers(name, company), items:sale_items(quantity, total, product:products(total_cost))"
      )
      .eq("doc_type", "factura")
      .neq("status", "cancelado")
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: false }),
    supabase.from("v_product_stock").select("*").order("stock_value", { ascending: false }),
    supabase.from("v_top_products").select("*").limit(15),
    supabase.from("v_customer_balance").select("*").order("balance", { ascending: false }).limit(15),
  ]);

  const invoices = (invoicesRes.data ?? []) as unknown as SaleRow[];
  const stock = (stockRes.data ?? []) as ProductStock[];
  const topProducts = (topRes.data ?? []) as TopProduct[];
  const balances = (customersRes.data ?? []) as { customer_id: string; name: string; company: string | null; balance: number }[];

  // Utilidad del mes: ingresos menos costo de los productos vendidos
  const revenue = invoices.reduce((sum, s) => sum + Number(s.total), 0);
  const cogs = invoices.reduce(
    (sum, s) =>
      sum +
      s.items.reduce((c, i) => c + i.quantity * Number(i.product?.total_cost ?? 0), 0),
    0
  );
  const profit = revenue - cogs;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const inventoryValue = stock.reduce((sum, p) => sum + Number(p.stock_value), 0);

  // Productos lentos: con existencias pero sin aparecer en los más vendidos
  const soldIds = new Set(topProducts.map((p) => p.product_id));
  const slowProducts = stock
    .filter((p) => p.total_quantity > 0 && !soldIds.has(p.product_id))
    .slice(0, 15);

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Indicadores del mes en curso y análisis del inventario"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Ventas del mes" value={formatCurrency(revenue)} icon={DollarSign} tone="success" />
        <StatCard title="Utilidad estimada" value={formatCurrency(profit)} icon={TrendingUp} tone={profit >= 0 ? "success" : "danger"} />
        <StatCard title="Margen" value={`${margin.toFixed(1)}%`} icon={Percent} />
        <StatCard title="Valor del inventario" value={formatCurrency(inventoryValue)} icon={Warehouse} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Ventas del mes */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas del mes ({invoices.length} facturas)</CardTitle>
            <ExportButtons
              filename="ventas-del-mes"
              headers={["Factura", "Cliente", "Fecha", "Total"]}
              rows={invoices.map((s) => [
                s.number,
                s.customer?.company || s.customer?.name || "",
                new Date(s.created_at).toLocaleDateString("es-DO"),
                Number(s.total).toFixed(2),
              ])}
            />
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto p-0">
            {invoices.length === 0 ? (
              <EmptyState title="Sin facturas este mes" />
            ) : (
              <Table>
                <THead>
                  <TR><TH>Factura</TH><TH>Cliente</TH><TH className="text-right">Total</TH></TR>
                </THead>
                <TBody>
                  {invoices.slice(0, 30).map((s) => (
                    <TR key={s.id}>
                      <TD className="font-medium">{s.number}</TD>
                      <TD className="text-muted">{s.customer?.company || s.customer?.name}</TD>
                      <TD className="text-right font-medium">{formatCurrency(s.total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Más vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos más vendidos</CardTitle>
            <ExportButtons
              filename="productos-mas-vendidos"
              headers={["SKU", "Producto", "Unidades", "Ingresos"]}
              rows={topProducts.map((p) => [p.sku, p.name, p.units_sold, Number(p.revenue).toFixed(2)])}
            />
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto p-0">
            {topProducts.length === 0 ? (
              <EmptyState title="Sin datos de ventas" />
            ) : (
              <Table>
                <THead>
                  <TR><TH>Producto</TH><TH className="text-right">Unidades</TH><TH className="text-right">Ingresos</TH></TR>
                </THead>
                <TBody>
                  {topProducts.map((p) => (
                    <TR key={p.product_id}>
                      <TD>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted">{p.sku}</p>
                      </TD>
                      <TD className="text-right">{formatNumber(p.units_sold)}</TD>
                      <TD className="text-right font-medium">{formatCurrency(p.revenue)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Productos lentos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos lentos (sin ventas)</CardTitle>
            <ExportButtons
              filename="productos-lentos"
              headers={["SKU", "Producto", "Existencia", "Valor inmovilizado"]}
              rows={slowProducts.map((p) => [p.sku, p.name, p.total_quantity, Number(p.stock_value).toFixed(2)])}
            />
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto p-0">
            {slowProducts.length === 0 ? (
              <EmptyState title="Sin productos lentos" description="Todos los productos con existencia registran ventas." />
            ) : (
              <Table>
                <THead>
                  <TR><TH>Producto</TH><TH className="text-right">Existencia</TH><TH className="text-right">Valor</TH></TR>
                </THead>
                <TBody>
                  {slowProducts.map((p) => (
                    <TR key={p.product_id}>
                      <TD>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted">{p.sku}</p>
                      </TD>
                      <TD className="text-right">{formatNumber(p.total_quantity)}</TD>
                      <TD className="text-right font-medium">{formatCurrency(p.stock_value)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Balance de clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes con balance pendiente</CardTitle>
            <ExportButtons
              filename="balances-clientes"
              headers={["Cliente", "Empresa", "Balance"]}
              rows={balances
                .filter((b) => Number(b.balance) > 0)
                .map((b) => [b.name, b.company ?? "", Number(b.balance).toFixed(2)])}
            />
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto p-0">
            {balances.filter((b) => Number(b.balance) > 0).length === 0 ? (
              <EmptyState title="Sin cuentas por cobrar" description="Ningún cliente tiene balance pendiente." />
            ) : (
              <Table>
                <THead>
                  <TR><TH>Cliente</TH><TH className="text-right">Balance</TH></TR>
                </THead>
                <TBody>
                  {balances
                    .filter((b) => Number(b.balance) > 0)
                    .map((b) => (
                      <TR key={b.customer_id}>
                        <TD>
                          <p className="font-medium">{b.company || b.name}</p>
                          {b.company && <p className="text-xs text-muted">{b.name}</p>}
                        </TD>
                        <TD className="text-right font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(b.balance)}
                        </TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Valor del inventario */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Inventario valorizado</CardTitle>
            <ExportButtons
              filename="inventario-valorizado"
              headers={["SKU", "Producto", "Existencia", "Costo unitario", "Valor total"]}
              rows={stock.map((p) => [
                p.sku,
                p.name,
                p.total_quantity,
                Number(p.total_cost).toFixed(2),
                Number(p.stock_value).toFixed(2),
              ])}
            />
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto p-0">
            {stock.length === 0 ? (
              <EmptyState title="Sin productos registrados" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Producto</TH>
                    <TH className="text-right">Existencia</TH>
                    <TH className="text-right">Costo unit.</TH>
                    <TH className="text-right">Valor total</TH>
                  </TR>
                </THead>
                <TBody>
                  {stock.slice(0, 50).map((p) => (
                    <TR key={p.product_id}>
                      <TD>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted">{p.sku}</p>
                      </TD>
                      <TD className="text-right">{formatNumber(p.total_quantity)}</TD>
                      <TD className="text-right">{formatCurrency(p.total_cost)}</TD>
                      <TD className="text-right font-semibold">{formatCurrency(p.stock_value)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
