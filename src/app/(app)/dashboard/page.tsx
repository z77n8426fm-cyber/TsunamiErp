import {
  AlertTriangle,
  DollarSign,
  PackageX,
  Package,
  TrendingUp,
  Users,
  Warehouse,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import {
  DOC_TYPE_LABELS,
  MOVEMENT_LABELS,
  MOVEMENT_STYLES,
  SALE_STATUS_LABELS,
  SALE_STATUS_STYLES,
} from "@/lib/constants";
import type { DashboardStats, InventoryMovement, Sale, TopProduct } from "@/lib/types";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/** MÓDULO 1 — Dashboard: indicadores, gráficas y actividad reciente. */
export default async function DashboardPage() {
  const supabase = await createClient();

  // Consultas en paralelo para máxima velocidad
  const [statsRes, topProductsRes, recentSalesRes, recentMovementsRes, salesSeriesRes] =
    await Promise.all([
      supabase.rpc("get_dashboard_stats"),
      supabase.from("v_top_products").select("*").limit(5),
      supabase
        .from("sales")
        .select("id, number, doc_type, status, total, created_at, customer:customers(id, name, company)")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("inventory_movements")
        .select("id, type, quantity, reference, created_at, product:products(id, sku, name)")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("sales")
        .select("total, created_at")
        .eq("doc_type", "factura")
        .neq("status", "cancelado")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

  const stats: DashboardStats = statsRes.data ?? {
    sales_today: 0,
    sales_month: 0,
    out_of_stock: 0,
    low_stock: 0,
    total_products: 0,
    total_customers: 0,
    inventory_value: 0,
  };
  const topProducts = (topProductsRes.data ?? []) as TopProduct[];
  const recentSales = (recentSalesRes.data ?? []) as unknown as Sale[];
  const recentMovements = (recentMovementsRes.data ?? []) as unknown as InventoryMovement[];

  // Serie de ventas de los últimos 30 días agrupada por día
  const salesByDay = new Map<string, number>();
  for (const row of salesSeriesRes.data ?? []) {
    const day = new Date(row.created_at).toISOString().slice(0, 10);
    salesByDay.set(day, (salesByDay.get(day) ?? 0) + Number(row.total));
  }
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    return {
      date: d.toLocaleDateString("es-DO", { day: "2-digit", month: "short" }),
      total: salesByDay.get(key) ?? 0,
    };
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumen general de TSUNAMI IMPORT en tiempo real"
      />

      {/* Indicadores principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ventas del día"
          value={formatCurrency(stats.sales_today)}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          title="Ventas del mes"
          value={formatCurrency(stats.sales_month)}
          icon={TrendingUp}
        />
        <StatCard
          title="Valor del inventario"
          value={formatCurrency(stats.inventory_value)}
          icon={Warehouse}
        />
        <StatCard
          title="Total de clientes"
          value={formatNumber(stats.total_customers)}
          icon={Users}
        />
        <StatCard
          title="Total de productos"
          value={formatNumber(stats.total_products)}
          icon={Package}
        />
        <StatCard
          title="Productos agotados"
          value={formatNumber(stats.out_of_stock)}
          icon={PackageX}
          tone="danger"
          hint="Sin existencias en ningún almacén"
        />
        <StatCard
          title="Inventario bajo"
          value={formatNumber(stats.low_stock)}
          icon={AlertTriangle}
          tone="warning"
          hint="Por debajo del mínimo configurado"
        />
        <StatCard
          title="Más vendido"
          value={topProducts[0]?.name ?? "—"}
          icon={TrendingUp}
          hint={topProducts[0] ? `${formatNumber(topProducts[0].units_sold)} unidades` : undefined}
        />
      </div>

      {/* Gráfica de ventas + top productos */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Ventas de los últimos 30 días</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos más vendidos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topProducts.length === 0 ? (
              <EmptyState title="Sin ventas registradas" description="Los productos más vendidos aparecerán aquí." />
            ) : (
              <ul className="divide-y divide-border">
                {topProducts.map((p, i) => (
                  <li key={p.product_id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted">{p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatNumber(p.units_sold)} uds</p>
                      <p className="text-xs text-muted">{formatCurrency(p.revenue)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimas ventas y últimos movimientos */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimas ventas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentSales.length === 0 ? (
              <EmptyState title="Sin ventas todavía" description="Crea tu primera cotización o factura en el módulo de Ventas." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Documento</TH>
                    <TH>Cliente</TH>
                    <TH>Estado</TH>
                    <TH className="text-right">Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {recentSales.map((s) => (
                    <TR key={s.id}>
                      <TD>
                        <p className="font-medium">{s.number}</p>
                        <p className="text-xs text-muted">{DOC_TYPE_LABELS[s.doc_type]}</p>
                      </TD>
                      <TD>{s.customer?.company || s.customer?.name || "—"}</TD>
                      <TD>
                        <Badge className={SALE_STATUS_STYLES[s.status]}>
                          {SALE_STATUS_LABELS[s.status]}
                        </Badge>
                      </TD>
                      <TD className="text-right font-semibold">{formatCurrency(s.total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos movimientos de inventario</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentMovements.length === 0 ? (
              <EmptyState title="Sin movimientos" description="Las entradas, salidas y ajustes aparecerán aquí." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Producto</TH>
                    <TH>Tipo</TH>
                    <TH className="text-right">Cantidad</TH>
                    <TH>Fecha</TH>
                  </TR>
                </THead>
                <TBody>
                  {recentMovements.map((m) => (
                    <TR key={m.id}>
                      <TD>
                        <p className="font-medium">{m.product?.name ?? "—"}</p>
                        <p className="text-xs text-muted">{m.product?.sku}</p>
                      </TD>
                      <TD>
                        <Badge className={MOVEMENT_STYLES[m.type]}>{MOVEMENT_LABELS[m.type]}</Badge>
                      </TD>
                      <TD className="text-right font-semibold">{formatNumber(m.quantity)}</TD>
                      <TD className="text-xs text-muted">{formatDateTime(m.created_at)}</TD>
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
