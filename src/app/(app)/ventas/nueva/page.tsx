import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { SaleForm } from "@/components/sales/sale-form";
import type { Warehouse } from "@/lib/types";

export const metadata = { title: "Nueva venta" };
export const dynamic = "force-dynamic";

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; producto?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [customersRes, productsRes, specialPricesRes, warehousesRes, settingsRes] =
    await Promise.all([
      supabase.from("customers").select("id, name, company").eq("is_active", true).order("name").limit(2000),
      supabase
        .from("products")
        .select("id, sku, name, wholesale_price, retail_price")
        .eq("is_active", true)
        .order("name")
        .limit(2000),
      supabase.from("customer_special_prices").select("customer_id, product_id, price"),
      supabase.from("warehouses").select("*").eq("is_active", true).order("name"),
      supabase.from("company_settings").select("tax_rate, quote_validity_days").single(),
    ]);

  return (
    <>
      <PageHeader
        title="Nueva venta"
        description="Crea una cotización, un pedido o una factura"
      />
      <SaleForm
        customers={customersRes.data ?? []}
        products={productsRes.data ?? []}
        specialPrices={specialPricesRes.data ?? []}
        warehouses={(warehousesRes.data ?? []) as Warehouse[]}
        taxRate={Number(settingsRes.data?.tax_rate ?? 18)}
        quoteValidityDays={Number(settingsRes.data?.quote_validity_days ?? 15)}
        initialCustomerId={params.cliente}
        initialProductId={params.producto}
      />
    </>
  );
}
