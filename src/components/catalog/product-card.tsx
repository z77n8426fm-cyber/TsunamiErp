import Link from "next/link";
import Image from "next/image";
import { Package, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Product } from "@/lib/types";

/** Tarjeta de producto del catálogo comercial. */
export function ProductCard({ product }: { product: Product }) {
  const image =
    product.images?.find((i) => i.is_primary)?.url ??
    [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
  const stock = (product.stock ?? []).reduce((sum, s) => sum + s.quantity, 0);

  return (
    <Link
      href={`/catalogo/${product.id}`}
      className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg animate-fade-in"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-hover">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-10 w-10 text-muted" />
          </div>
        )}
        {product.video_url && (
          <span className="absolute left-2 top-2 rounded-full bg-black/60 p-1.5 text-white">
            <PlayCircle className="h-4 w-4" />
          </span>
        )}
        <span className="absolute right-2 top-2">
          {stock === 0 ? (
            <Badge className="bg-red-600 text-white">Agotado</Badge>
          ) : (
            <Badge className="bg-black/60 text-white backdrop-blur">
              {formatNumber(stock)} disp.
            </Badge>
          )}
        </span>
      </div>

      <div className="p-3">
        {product.brand?.name && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {product.brand.name}
          </p>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400">
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className="text-base font-bold text-brand-700 dark:text-brand-300">
            {formatCurrency(product.wholesale_price)}
          </p>
          {(product.color || product.size) && (
            <p className="truncate text-xs text-muted">
              {[product.color, product.size].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
