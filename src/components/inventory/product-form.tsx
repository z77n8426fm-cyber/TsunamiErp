"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2, Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { suggestSku, formatCurrency } from "@/lib/utils";
import type { Brand, Category, Product, ProductImage, Supplier } from "@/lib/types";

interface Props {
  product?: Product;
  brands: Brand[];
  categories: Category[];
  subcategories: Category[];
  suppliers: Supplier[];
}

/**
 * Formulario de creación/edición de productos (Módulo 2).
 * Las fotos se suben al bucket público "products" de Supabase Storage.
 */
export function ProductForm({ product, brands, categories, subcategories, suppliers }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = Boolean(product);

  const [form, setForm] = useState({
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    brand_id: product?.brand_id ?? "",
    category_id: product?.category_id ?? "",
    subcategory_id: product?.subcategory_id ?? "",
    color: product?.color ?? "",
    size: product?.size ?? "",
    material: product?.material ?? "",
    country_of_origin: product?.country_of_origin ?? "",
    supplier_id: product?.supplier_id ?? "",
    fob_cost: product?.fob_cost ?? 0,
    import_expenses: product?.import_expenses ?? 0,
    suggested_price: product?.suggested_price ?? 0,
    wholesale_price: product?.wholesale_price ?? 0,
    retail_price: product?.retail_price ?? 0,
    min_stock: product?.min_stock ?? 10,
    video_url: product?.video_url ?? "",
  });

  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const filteredSubcategories = subcategories.filter((s) => s.parent_id === form.category_id);
  const totalCost = Number(form.fob_cost || 0) + Number(form.import_expenses || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload = {
        ...form,
        barcode: form.barcode || null,
        brand_id: form.brand_id || null,
        category_id: form.category_id || null,
        subcategory_id: form.subcategory_id || null,
        supplier_id: form.supplier_id || null,
        video_url: form.video_url || null,
        fob_cost: Number(form.fob_cost),
        import_expenses: Number(form.import_expenses),
        suggested_price: Number(form.suggested_price),
        wholesale_price: Number(form.wholesale_price),
        retail_price: Number(form.retail_price),
        min_stock: Number(form.min_stock),
      };

      let productId = product?.id;

      if (isEdit) {
        const { error } = await supabase.from("products").update(payload).eq("id", productId!);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Subida de fotos nuevas al bucket "products"
      for (const file of newFiles) {
        const path = `${productId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("products").upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("products").getPublicUrl(path);
        const { error: imgError } = await supabase.from("product_images").insert({
          product_id: productId,
          url: urlData.publicUrl,
          is_primary: images.length === 0 && newFiles.indexOf(file) === 0,
        });
        if (imgError) throw imgError;
      }

      router.push(`/inventario/${productId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el producto.");
      setSaving(false);
    }
  }

  async function removeImage(img: ProductImage) {
    await supabase.from("product_images").delete().eq("id", img.id);
    setImages((imgs) => imgs.filter((i) => i.id !== img.id));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Información general */}
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Información general</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre del producto" required className="sm:col-span-2">
              <Input value={form.name} onChange={set("name")} required placeholder="Camiseta básica algodón" />
            </Field>
            <Field label="Código SKU" required>
              <div className="flex gap-2">
                <Input value={form.sku} onChange={set("sku")} required placeholder="CAMI-NEG-L-1234" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Generar SKU automáticamente"
                  onClick={() => setForm((f) => ({ ...f, sku: suggestSku(f.name, f.color, f.size) }))}
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
            </Field>
            <Field label="Código de barras">
              <Input value={form.barcode} onChange={set("barcode")} placeholder="7460123456789" />
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <Textarea value={form.description} onChange={set("description")} placeholder="Detalles del producto..." />
            </Field>
            <Field label="Marca">
              <Select value={form.brand_id} onChange={set("brand_id")}>
                <option value="">Sin marca</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Categoría">
              <Select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value, subcategory_id: "" }))}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Subcategoría">
              <Select value={form.subcategory_id} onChange={set("subcategory_id")} disabled={!filteredSubcategories.length}>
                <option value="">Sin subcategoría</option>
                {filteredSubcategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Color">
              <Input value={form.color} onChange={set("color")} placeholder="Negro" />
            </Field>
            <Field label="Talla">
              <Input value={form.size} onChange={set("size")} placeholder="L" />
            </Field>
            <Field label="Material">
              <Input value={form.material} onChange={set("material")} placeholder="100% algodón" />
            </Field>
            <Field label="País de origen">
              <Input value={form.country_of_origin} onChange={set("country_of_origin")} placeholder="China" />
            </Field>
            <Field label="Proveedor">
              <Select value={form.supplier_id} onChange={set("supplier_id")}>
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Video (URL opcional)">
              <Input value={form.video_url} onChange={set("video_url")} placeholder="https://youtube.com/..." />
            </Field>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Costos y precios */}
          <Card>
            <CardHeader><CardTitle>Costos y precios</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Costo FOB (US$)">
                <Input type="number" step="0.01" min="0" value={form.fob_cost} onChange={set("fob_cost")} />
              </Field>
              <Field label="Gastos importación">
                <Input type="number" step="0.01" min="0" value={form.import_expenses} onChange={set("import_expenses")} />
              </Field>
              <div className="col-span-2 rounded-lg bg-surface-hover px-3 py-2 text-sm">
                Costo total: <span className="font-semibold">{formatCurrency(totalCost)}</span>
              </div>
              <Field label="Precio sugerido">
                <Input type="number" step="0.01" min="0" value={form.suggested_price} onChange={set("suggested_price")} />
              </Field>
              <Field label="Precio por mayor">
                <Input type="number" step="0.01" min="0" value={form.wholesale_price} onChange={set("wholesale_price")} />
              </Field>
              <Field label="Precio por unidad">
                <Input type="number" step="0.01" min="0" value={form.retail_price} onChange={set("retail_price")} />
              </Field>
              <Field label="Inventario mínimo">
                <Input type="number" min="0" value={form.min_stock} onChange={set("min_stock")} />
              </Field>
            </CardContent>
          </Card>

          {/* Fotografías */}
          <Card>
            <CardHeader><CardTitle>Fotografías</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img) => (
                  <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                    <Image src={img.url} alt="" fill className="object-cover" sizes="120px" />
                    <button
                      type="button"
                      onClick={() => removeImage(img)}
                      className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Eliminar foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {newFiles.map((file, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-dashed border-brand-400">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewFiles((fs) => fs.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white"
                      aria-label="Quitar foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted transition-colors hover:border-brand-400 hover:text-brand-500">
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Agregar</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => setNewFiles((fs) => [...fs, ...Array.from(e.target.files ?? [])])}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" loading={saving}>
          {isEdit ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
