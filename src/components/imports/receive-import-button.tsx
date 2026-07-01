"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PackageCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import type { ImportOrder, Warehouse } from "@/lib/types";

/**
 * Recepción de una importación: genera movimientos de ENTRADA por cada
 * producto de la orden en el almacén elegido y marca la orden como recibida.
 */
export function ReceiveImportButton({
  importOrder,
  warehouses,
}: {
  importOrder: ImportOrder;
  warehouses: Warehouse[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((w) => w.is_default)?.id ?? warehouses[0]?.id ?? ""
  );

  const items = importOrder.items ?? [];

  async function handleReceive() {
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    for (const item of items) {
      const { error } = await supabase.from("inventory_movements").insert({
        product_id: item.product_id,
        warehouse_id: warehouseId,
        type: "entrada",
        quantity: item.quantity,
        unit_cost: item.unit_fob_cost,
        reference: importOrder.po_number,
        notes: `Recepción de importación ${importOrder.po_number}`,
        created_by: userData.user?.id,
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
    }

    await supabase.from("imports").update({ status: "recibida" }).eq("id", importOrder.id);

    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={items.length === 0}>
        <PackageCheck className="h-4 w-4" /> Recibir en almacén
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recibir importación</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-hover"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-muted">
              Se registrará la entrada de{" "}
              <span className="font-semibold text-foreground">
                {items.reduce((sum, i) => sum + i.quantity, 0)} unidades
              </span>{" "}
              ({items.length} productos) al inventario y la orden quedará marcada como recibida.
            </p>

            <Field label="Almacén de destino" required>
              <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </Field>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleReceive} loading={busy}>Confirmar recepción</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
