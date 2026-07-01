import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Customer } from "@/lib/types";

export const metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

/** MÓDULO 4 — Clientes: directorio con balance pendiente. */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) query = query.or(`name.ilike.%${q}%,company.ilike.%${q}%,rnc.ilike.%${q}%,phone.ilike.%${q}%`);

  const [{ data, count }, balancesRes] = await Promise.all([
    query,
    supabase.from("v_customer_balance").select("*"),
  ]);

  const customers = (data ?? []) as Customer[];
  const balances = new Map(
    (balancesRes.data ?? []).map((b) => [b.customer_id as string, Number(b.balance)])
  );

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${formatNumber(count ?? 0)} clientes registrados`}
        actions={
          <Link href="/clientes/nuevo">
            <Button>
              <Plus className="h-4 w-4" /> Nuevo cliente
            </Button>
          </Link>
        }
      />

      <SearchInput placeholder="Buscar por nombre, empresa, RNC o teléfono..." basePath="/clientes" />

      <Card className="mt-4">
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No hay clientes"
              description="Registra tu primer cliente para comenzar a vender."
              action={
                <Link href="/clientes/nuevo">
                  <Button size="sm"><Plus className="h-4 w-4" /> Nuevo cliente</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Contacto</TH>
                  <TH>Ubicación</TH>
                  <TH>RNC</TH>
                  <TH className="text-right">Balance pendiente</TH>
                </TR>
              </THead>
              <TBody>
                {customers.map((c) => {
                  const balance = balances.get(c.id) ?? 0;
                  return (
                    <TR key={c.id}>
                      <TD>
                        <Link href={`/clientes/${c.id}`} className="group">
                          <p className="font-medium group-hover:text-brand-600 dark:group-hover:text-brand-400">
                            {c.name}
                          </p>
                          {c.company && <p className="text-xs text-muted">{c.company}</p>}
                        </Link>
                      </TD>
                      <TD>
                        <p>{c.phone || c.whatsapp || "—"}</p>
                        {c.email && <p className="text-xs text-muted">{c.email}</p>}
                      </TD>
                      <TD className="text-muted">
                        {[c.city, c.province].filter(Boolean).join(", ") || "—"}
                      </TD>
                      <TD className="text-muted">{c.rnc || "—"}</TD>
                      <TD className={`text-right font-semibold ${balance > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                        {formatCurrency(balance)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
