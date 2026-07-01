"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { ImportOrder, ImportStatus, Supplier } from "@/lib/types";
import { IMPORT_STATUS_LABELS } from "@/lib/constants";

interface ProductOption {
  id: string;
  sku: string;
  name: string;
  fob_cost: number;
}

interface ItemLine {
  product_id: string;
  quantity: number;
  unit_fob_cost: number;
}

/** Formulario de importación (Módulo 6): PO, logística, costos y productos. */
export function ImportForm({
  importOrder,
  suppliers,
  products,
}: {
  importOrder?: ImportOrder;
  suppliers: Supplier[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const isEdit = Boolean(importOrder);

  const [form, setForm] = useState({
    po_number: importOrder?.po_number ?? "",
    supplier_id: importOrder?.supplier_id ?? "",
    status: (importOrder?.status ?? "borrador") as ImportStatus,
    commercial_invoice: importOrder?.commercial_invoice ?? "",
    packing_list: importOrder?.packing_list ?? "",
    bl_number: importOrder?.bl_number ?? "",
    container_number: importOrder?.container_number ?? "",
    etd: importOrder?.etd ?? "",
    eta: importOrder?.eta ?? "",
    port: importOrder?.port ?? "",
    shipping_line: importOrder?.shipping_line ?? "",
    fob_cost: importOrder?.fob_cost ?? 0,
    freight_cost: importOrder?.freight_cost ?? 0,
    insurance_cost: importOrder?.insurance_cost ?? 0,
    customs_cost: importOrder?.customs_cost ?? 0,
    other_costs: importOrder?.other_costs ?? 0,
    currency: importOrder?.currency ?? "USD",
    notes: importOrder?.notes ?? "",
  });

  const [items, setItems] = useState<ItemLine[]>(
    (importOrder?.items ?? []).map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_fob_cost: i.unit_fob_cost,
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const totalCost = useMemo(
    () =>
      Number(form.fob_cost) +
      Number(form.freight_cost) +
      Number(form.insurance_cost) +
      Number(form.customs_cost) +
      Number(form.other_costs),
    [form.fob_cost, form.freight_cost, form.insurance_cost, form.customs_cost, form.other_costs]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    const payload = {
      ...form,
      supplier_id: form.supplier_id,
      etd: form.etd || null,
      eta: form.eta || null,
      fob_cost: Number(form.fob_cost),
      freight_cost: Number(form.freight_cost),
      insurance_cost: Number(form.insurance_cost),
      customs_cost: Number(form.customs_cost),
      other_costs: Number(form.other_costs),
      commercial_invoice: form.commercial_invoice || null,
      packing_list: form.packing_list || null,
      bl_number: form.bl_number || null,
      container_number: form.container_number || null,
      port: form.port || null,
      shipping_line: form.shipping_line || null,
      notes: form.notes || null,
      created_by: userData.user?.id,
    };

    const result = isEdit
      ? await supabase.from("imports").update(payload).eq("id", importOrder!.id).select("id").single()
      : await supabase.from("imports").insert(payload).select("id").single();

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Error al guardar.");
      setSaving(false);
      return;
    }

    const importId = result.data.id;

    // Reemplaza las líneas de productos por las actuales
    await supabase.from("import_items").delete().eq("import_id", importId);
    const validItems = items.filter((i) => i.product_id && i.quantity > 0);
    if (validItems.length > 0) {
      const { error: itemsError } = await supabase.from("import_items").insert(
        validItems.map((i) => ({
          import_id: importId,
          product_id: i.product_id,
          quantity: Number(i.quantity),
          unit_fob_cost: Number(i.unit_fob_cost),
        }))
      );
      if (itemsError) {
        setError(itemsError.message);
        setSaving(false);
        return;
      }
    }

    router.push(`/importaciones/${importId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Datos de la orden</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Número de PO" required>
              <Input value={form.po_number} onChange={set("po_number")} required placeholder="PO-2026-001" />
            </Field>
            <Field label="Proveedor" required>
              <Select value={form.supplier_id} onChange={set("supplier_id")} required>
                <option value="">Selecciona proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} {s.country ? `(${s.country})` : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={form.status} onChange={set("status")}>
                {Object.entries(IMPORT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Factura comercial">
              <Input value={form.commercial_invoice} onChange={set("commercial_invoice")} placeholder="CI-88291" />
            </Field>
            <Field label="Packing list">
              <Input value={form.packing_list} onChange={set("packing_list")} placeholder="PL-88291" />
            </Field>
            <Field label="BL (Bill of Lading)">
              <Input value={form.bl_number} onChange={set("bl_number")} placeholder="MSCUXX123456" />
            </Field>
            <Field label="Contenedor">
              <Input value={form.container_number} onChange={set("container_number")} placeholder="MSCU1234567" />
            </Field>
            <Field label="ETD (salida)">
              <Input type="date" value={form.etd} onChange={set("etd")} />
            </Field>
            <Field label="ETA (llegada)">
              <Input type="date" value={form.eta} onChange={set("eta")} />
            </Field>
            <Field label="Puerto">
              <Input value={form.port} onChange={set("port")} placeholder="Puerto Caucedo" />
            </Field>
            <Field label="Naviera">
              <Input value={form.shipping_line} onChange={set("shipping_line")} placeholder="MSC, Maersk..." />
            </Field>
            <Field label="Notas" className="sm:col-span-3">
              <Textarea value={form.notes} onChange={set("notes")} />
            </Field>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Costos</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Moneda" className="col-span-2">
              <Select value={form.currency} onChange={set("currency")}>
                <option value="USD">USD — Dólar</option>
                <option value="DOP">DOP — Peso dominicano</option>
              </Select>
            </Field>
            <Field label="Costo FOB">
              <Input type="number" min="0" step="0.01" value={form.fob_cost} onChange={set("fob_cost")} />
            </Field>
            <Field label="Flete">
              <Input type="number" min="0" step="0.01" value={form.freight_cost} onChange={set("freight_cost")} />
            </Field>
            <Field label="Seguro">
              <Input type="number" min="0" step="0.01" value={form.insurance_cost} onChange={set("insurance_cost")} />
            </Field>
            <Field label="Aduanas">
              <Input type="number" min="0" step="0.01" value={form.customs_cost} onChange={set("customs_cost")} />
            </Field>
            <Field label="Otros gastos" className="col-span-2">
              <Input type="number" min="0" step="0.01" value={form.other_costs} onChange={set("other_costs")} />
            </Field>
            <div className="col-span-2 rounded-lg bg-surface-hover px-3 py-2.5 text-sm">
              Costo final:{" "}
              <span className="font-bold">
                {form.currency === "USD" ? "US$" : "RD$"}{" "}
                {totalCost.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productos de la orden */}
      <Card>
        <CardHeader>
          <CardTitle>Productos de la orden</CardTitle>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setItems((xs) => [...xs, { product_id: "", quantity: 1, unit_fob_cost: 0 }])}
          >
            <Plus className="h-4 w-4" /> Agregar producto
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              Agrega los productos incluidos en esta importación.
            </p>
          )}
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 items-end gap-2">
              <Field label={i === 0 ? "Producto" : ""} className="col-span-12 sm:col-span-6">
                <Select
                  value={item.product_id}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    setItems((xs) =>
                      xs.map((x, j) =>
                        j === i
                          ? { ...x, product_id: e.target.value, unit_fob_cost: p?.fob_cost ?? x.unit_fob_cost }
                          : x
                      )
                    );
                  }}
                >
                  <option value="">Selecciona producto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={i === 0 ? "Cantidad" : ""} className="col-span-5 sm:col-span-2">
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    setItems((xs) => xs.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))
                  }
                />
              </Field>
              <Field label={i === 0 ? "FOB unitario" : ""} className="col-span-5 sm:col-span-3">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_fob_cost}
                  onChange={(e) =>
                    setItems((xs) => xs.map((x, j) => (j === i ? { ...x, unit_fob_cost: Number(e.target.value) } : x)))
                  }
                />
              </Field>
              <div className="col-span-2 flex h-10 items-center justify-end sm:col-span-1">
                <button
                  type="button"
                  onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  aria-label="Eliminar línea"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" loading={saving}>
          {isEdit ? "Guardar cambios" : "Crear importación"}
        </Button>
      </div>
    </form>
  );
}
