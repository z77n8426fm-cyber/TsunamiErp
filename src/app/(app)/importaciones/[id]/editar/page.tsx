import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ImportForm } from "@/components/imports/import-form";
import type { ImportOrder, Supplier } from "@/lib/types";

export const metadata = { title: "Editar importación" };
export const dynamic = "force-dynamic";

export default async function EditImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [importRes, suppliersRes, productsRes] = await Promise.all([
    supabase.from("imports").select("*, items:import_items(*)").eq("id", id).single(),
    supabase.from("suppliers").select("*").eq("is_active", true).order("name"),
    supabase.from("products").select("id, sku, name, fob_cost").eq("is_active", true).order("name").limit(2000),
  ]);

  if (!importRes.data) notFound();

  return (
    <>
      <PageHeader title="Editar importación" description={importRes.data.po_number} />
      <ImportForm
        importOrder={importRes.data as unknown as ImportOrder}
        suppliers={(suppliersRes.data ?? []) as Supplier[]}
        products={productsRes.data ?? []}
      />
    </>
  );
}
