import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/inventory/product-form";
import type { Brand, Category, Product, Supplier } from "@/lib/types";

export const metadata = { title: "Editar producto" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [productRes, brandsRes, categoriesRes, suppliersRes] = await Promise.all([
    supabase.from("products").select("*, images:product_images(*)").eq("id", id).single(),
    supabase.from("brands").select("*").eq("is_active", true).order("name"),
    supabase.from("categories").select("*").eq("is_active", true).order("name"),
    supabase.from("suppliers").select("*").eq("is_active", true).order("name"),
  ]);

  if (!productRes.data) notFound();

  const allCategories = (categoriesRes.data ?? []) as Category[];

  return (
    <>
      <PageHeader title="Editar producto" description={productRes.data.name} />
      <ProductForm
        product={productRes.data as Product}
        brands={(brandsRes.data ?? []) as Brand[]}
        categories={allCategories.filter((c) => !c.parent_id)}
        subcategories={allCategories.filter((c) => c.parent_id)}
        suppliers={(suppliersRes.data ?? []) as Supplier[]}
      />
    </>
  );
}
