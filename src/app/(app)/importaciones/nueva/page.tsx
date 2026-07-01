import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ImportForm } from "@/components/imports/import-form";
import { SupplierQuickAdd } from "@/components/imports/supplier-quick-add";
import type { Supplier } from "@/lib/types";

export const metadata = { title: "Nueva importación" };
export const dynamic = "force-dynamic";

export default async function NewImportPage() {
  const supabase = await createClient();

  const [suppliersRes, productsRes] = await Promise.all([
    supabase.from("suppliers").select("*").eq("is_active", true).order("name"),
    supabase.from("products").select("id, sku, name, fob_cost").eq("is_active", true).order("name").limit(2000),
  ]);

  return (
    <>
      <PageHeader
        title="Nueva importación"
        description="Registra una orden de compra internacional"
        actions={<SupplierQuickAdd />}
      />
      <ImportForm
        suppliers={(suppliersRes.data ?? []) as Supplier[]}
        products={productsRes.data ?? []}
      />
    </>
  );
}
