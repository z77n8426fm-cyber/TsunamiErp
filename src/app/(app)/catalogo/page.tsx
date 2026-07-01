import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { ProductCard } from "@/components/catalog/product-card";
import { BookImage } from "lucide-react";
import type { Brand, Category, Product } from "@/lib/types";

export const metadata = { title: "Catálogo" };
export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  categoria?: string;
  marca?: string;
  color?: string;
  talla?: string;
  precio_max?: string;
}

/** MÓDULO 3 — Catálogo visual de productos con buscador y filtros. */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      "id, sku, name, description, color, size, wholesale_price, retail_price, video_url, brand:brands(id, name), images:product_images(url, is_primary, sort_order), stock:inventory_stock(quantity)"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(60);

  if (params.q) query = query.or(`name.ilike.%${params.q}%,sku.ilike.%${params.q}%`);
  if (params.categoria) query = query.eq("category_id", params.categoria);
  if (params.marca) query = query.eq("brand_id", params.marca);
  if (params.color) query = query.ilike("color", `%${params.color}%`);
  if (params.talla) query = query.eq("size", params.talla);
  if (params.precio_max) query = query.lte("wholesale_price", Number(params.precio_max));

  const [{ data }, brandsRes, categoriesRes, colorsRes, sizesRes] = await Promise.all([
    query,
    supabase.from("brands").select("id, name").eq("is_active", true).order("name"),
    supabase.from("categories").select("id, name, parent_id").is("parent_id", null).eq("is_active", true).order("name"),
    supabase.from("products").select("color").eq("is_active", true).not("color", "is", null),
    supabase.from("products").select("size").eq("is_active", true).not("size", "is", null),
  ]);

  const products = (data ?? []) as unknown as Product[];
  const colors = Array.from(new Set((colorsRes.data ?? []).map((r) => r.color as string))).sort();
  const sizes = Array.from(new Set((sizesRes.data ?? []).map((r) => r.size as string))).sort();

  return (
    <>
      <PageHeader
        title="Catálogo"
        description="Vista comercial de los productos disponibles"
      />

      <CatalogFilters
        brands={(brandsRes.data ?? []) as Brand[]}
        categories={(categoriesRes.data ?? []) as Category[]}
        colors={colors}
        sizes={sizes}
      />

      {products.length === 0 ? (
        <EmptyState
          icon={BookImage}
          title="No se encontraron productos"
          description="Ajusta los filtros o registra productos en el módulo de Inventario."
        />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  );
}
