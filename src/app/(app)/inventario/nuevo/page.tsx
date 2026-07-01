import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/inventory/product-form";
import type { Brand, Category, Supplier } from "@/lib/types";

export const metadata = { title: "Nuevo producto" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const supabase = await createClient();

  const [brandsRes, categoriesRes, suppliersRes] = await Promise.all([
    supabase.from("brands").select("*").eq("is_active", true).order("name"),
    supabase.from("categories").select("*").eq("is_active", true).order("name"),
    supabase.from("suppliers").select("*").eq("is_active", true).order("name"),
  ]);

  const allCategories = (categoriesRes.data ?? []) as Category[];

  return (
    <>
      <PageHeader title="Nuevo producto" description="Registra un producto en el inventario" />
      <ProductForm
        brands={(brandsRes.data ?? []) as Brand[]}
        categories={allCategories.filter((c) => !c.parent_id)}
        subcategories={allCategories.filter((c) => c.parent_id)}
        suppliers={(suppliersRes.data ?? []) as Supplier[]}
      />
    </>
  );
}
