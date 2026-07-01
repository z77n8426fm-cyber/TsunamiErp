import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductGallery } from "@/components/inventory/product-gallery";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Vista comercial del producto: fotos, precios, colores y tallas disponibles
 * (variantes del mismo nombre) y existencia total.
 */
export default async function CatalogProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(
      "*, brand:brands(id, name), category:categories!products_category_id_fkey(id, name), images:product_images(*), stock:inventory_stock(quantity, warehouse_id)"
    )
    .eq("id", id)
    .single();

  const product = data as unknown as Product | null;
  if (!product) notFound();

  // Variantes: productos activos con el mismo nombre (otros colores/tallas)
  const { data: variantsData } = await supabase
    .from("products")
    .select("id, color, size, stock:inventory_stock(quantity)")
    .eq("name", product.name)
    .eq("is_active", true);

  const variants = (variantsData ?? []) as unknown as Pick<Product, "id" | "color" | "size" | "stock">[];
  const availableColors = Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[];
  const availableSizes = Array.from(new Set(variants.map((v) => v.size).filter(Boolean))) as string[];
  const stock = (product.stock ?? []).reduce((sum, s) => sum + s.quantity, 0);

  return (
    <>
      <Link
        href="/catalogo"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProductGallery images={product.images ?? []} videoUrl={product.video_url} name={product.name} />

        <div className="space-y-5">
          <div>
            {product.brand?.name && (
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {product.brand.name}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">{product.name}</h1>
            <p className="mt-1 text-sm text-muted">
              SKU: {product.sku}
              {product.category?.name ? ` · ${product.category.name}` : ""}
            </p>
          </div>

          <div className="flex items-baseline gap-4">
            <p className="text-3xl font-bold text-brand-700 dark:text-brand-300">
              {formatCurrency(product.wholesale_price)}
            </p>
            <p className="text-sm text-muted">por mayor</p>
            {product.retail_price > 0 && (
              <p className="text-sm text-muted">
                Unidad: <span className="font-semibold text-foreground">{formatCurrency(product.retail_price)}</span>
              </p>
            )}
          </div>

          {stock === 0 ? (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400">Agotado</Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400">
              {formatNumber(stock)} unidades disponibles
            </Badge>
          )}

          {product.description && (
            <p className="text-sm leading-relaxed text-muted">{product.description}</p>
          )}

          {availableColors.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Colores disponibles</p>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((c) => (
                  <Badge
                    key={c}
                    className={
                      c === product.color
                        ? "bg-brand-700 text-white"
                        : "border border-border bg-surface text-foreground"
                    }
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {availableSizes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Tallas disponibles</p>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((s) => (
                  <Badge
                    key={s}
                    className={
                      s === product.size
                        ? "bg-brand-700 text-white"
                        : "border border-border bg-surface text-foreground"
                    }
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Card>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Material", product.material],
                ["Origen", product.country_of_origin],
                ["Color", product.color],
                ["Talla", product.size],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="text-muted">{label}:</span>
                  <span className="font-medium">{value || "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Link href={`/ventas/nueva?producto=${product.id}`}>
            <Button size="lg" className="w-full sm:w-auto">Crear cotización con este producto</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
