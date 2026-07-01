"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { MOVEMENT_LABELS } from "@/lib/constants";
import type { MovementType, Warehouse } from "@/lib/types";

interface ProductOption {
  id: string;
  sku: string;
  name: string;
}

/** Diálogo para registrar un movimiento de inventario. */
export function MovementForm({
  warehouses,
  products,
}: {
  warehouses: Warehouse[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultWarehouse = warehouses.find((w) => w.is_default)?.id ?? warehouses[0]?.id ?? "";

  const [form, setForm] = useState({
    product_id: "",
    type: "entrada" as MovementType,
    warehouse_id: defaultWarehouse,
    to_warehouse_id: "",
    quantity: 1,
    reference: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("inventory_movements").insert({
      product_id: form.product_id,
      type: form.type,
      warehouse_id: form.warehouse_id,
      to_warehouse_id: form.type === "transferencia" ? form.to_warehouse_id : null,
      quantity: Number(form.quantity),
      reference: form.reference || null,
      notes: form.notes || null,
      created_by: userData.user?.id,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }

    setOpen(false);
    setForm((f) => ({ ...f, product_id: "", quantity: 1, reference: "", notes: "" }));
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Registrar movimiento
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Registrar movimiento</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-hover"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Producto" required>
                <Select
                  value={form.product_id}
                  onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                  required
                >
                  <option value="">Selecciona un producto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo de movimiento" required>
                  <Select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MovementType }))}
                  >
                    {(Object.keys(MOVEMENT_LABELS) as MovementType[]).map((t) => (
                      <option key={t} value={t}>{MOVEMENT_LABELS[t]}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={form.type === "ajuste" ? "Cantidad contada" : "Cantidad"} required>
                  <Input
                    type="number"
                    min={form.type === "ajuste" ? 0 : 1}
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label={form.type === "transferencia" ? "Almacén origen" : "Almacén"} required>
                  <Select
                    value={form.warehouse_id}
                    onChange={(e) => setForm((f) => ({ ...f, warehouse_id: e.target.value }))}
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </Select>
                </Field>
                {form.type === "transferencia" && (
                  <Field label="Almacén destino" required>
                    <Select
                      value={form.to_warehouse_id}
                      onChange={(e) => setForm((f) => ({ ...f, to_warehouse_id: e.target.value }))}
                      required
                    >
                      <option value="">Selecciona destino</option>
                      {warehouses
                        .filter((w) => w.id !== form.warehouse_id)
                        .map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </Select>
                  </Field>
                )}
              </div>

              <Field label="Referencia (opcional)">
                <Input
                  value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="Ej. PO-000012, conteo físico..."
                />
              </Field>

              <Field label="Notas (opcional)">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </Field>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={saving}>Guardar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
