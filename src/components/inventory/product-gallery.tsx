"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/lib/types";

/** Galería de fotos del producto con miniaturas y enlace a video. */
export function ProductGallery({
  images,
  videoUrl,
  name,
}: {
  images: ProductImage[];
  videoUrl?: string | null;
  name: string;
}) {
  const sorted = [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  const [selected, setSelected] = useState(0);
  const current = sorted[selected];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface-hover">
          {current ? (
            <Image src={current.url} alt={name} fill className="object-cover" sizes="(max-width: 1280px) 100vw, 380px" priority />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-14 w-14 text-muted" />
            </div>
          )}
        </div>

        {sorted.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {sorted.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setSelected(i)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-md border-2 transition-colors",
                  i === selected ? "border-brand-500" : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <Image src={img.url} alt="" fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        )}

        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-surface-hover dark:text-brand-400"
          >
            <PlayCircle className="h-4 w-4" /> Ver video del producto
          </a>
        )}
      </CardContent>
    </Card>
  );
}
