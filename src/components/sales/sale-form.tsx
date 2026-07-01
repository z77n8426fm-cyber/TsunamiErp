"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { SaleDocType, Warehouse } from "@/lib/types";

interface CustomerOption {
  id: string;
  name: string;
  company: string | null;
}

interface ProductOption {
  id: string;
  sku: string;
  name: string;
  wholesale_price: number;
  retail_price: number;
}

interface SpecialPrice {
  customer_id: string;
  product_id: string;
  price: number;
}

interface Line {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

interface Props {
  customers: CustomerOption[];
  products: ProductOption[];
  specialPrices: SpecialPrice[];
  warehouses: Warehouse[];
  taxRate: number;
  quoteValidityDays: number;
  initialCustomerId?: string;
  initialProductId?: string;
}

/**
 * Formulario de venta (Módulo 5): crea cotizaciones, pedidos o facturas
 * con líneas de producto, descuentos e ITBIS. Si el cliente tiene precio
 * especial para un producto, se aplica automáticamente.
 */
export function SaleForm({
  customers,
  products,
  specialPrices,
  warehouses,
  taxRate,
  quoteValidityDays,
  initialCustomerId,
  initialProductId,
}: Props) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [docType, setDocType] = useState<SaleDocType>("cotizacion");
  const [warehouseId, setWarehouseId] = useState(
    warehouses.find((w) => w.is_default)?.id ?? warehouses[0]?.id ?? ""
  );
  const [applyTax, setApplyTax] = useState(true);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>(() => {
    if (!initialProductId) return [];
    const p = products.find((x) => x.id === initialProductId);
    return p ? [{ product_id: p.id, quantity: 1, unit_price: p.wholesale_price, discount: 0 }] : [];
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Precio para un producto considerando el precio especial del cliente. */
  function priceFor(productId: string): number {
    const special = specialPrices.find(
      (sp) => sp.customer_id === customerId && sp.product_id === productId
    );
    if (special) return Number(special.price);
    return Number(products.find((p) => p.id === productId)?.wholesale_price ?? 0);
  }

  function addLine() {
    setLines((ls) => [...ls, { product_id: "", quantity: 1, unit_price: 0, discount: 0 }]);
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((ls) =>
      ls.map((l, i) => {
        if (i !== index) return l;
        const next = { ...l, ...patch };
        // Al cambiar de producto se recalcula el precio automáticamente
        if (patch.product_id !== undefined && patch.product_id) {
          next.unit_price = priceFor(patch.product_id);
        }
        return next;
      })
    );
  }

  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (sum, l) => sum + l.quantity * l.unit_price - l.discount,
      0
    );
    const discountAmount = subtotal * (discountPercent / 100);
    const taxable = subtotal - discountAmount;
    const taxAmount = applyTax ? taxable * (taxRate / 100) : 0;
    return { subtotal, discountAmount, taxAmount, total: taxable + taxAmount };
  }, [lines, discountPercent, applyTax, taxRate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validLines = lines.filter((l) => l.product_id && l.quantity > 0);
    if (!customerId) return setError("Selecciona un cliente.");
    if (validLines.length === 0) return setError("Agrega al menos un producto.");

    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + quoteValidityDays);

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        doc_type: docType,
        customer_id: customerId,
        warehouse_id: warehouseId || null,
        subtotal: totals.subtotal,
        discount_percent: discountPercent,
        discount_amount: totals.discountAmount,
        tax_amount: totals.taxAmount,
        total: totals.total,
        valid_until: docType === "cotizacion" ? validUntil.toISOString().slice(0, 10) : null,
        notes: notes || null,
        created_by: userData.user?.id,
      })
      .select("id, number")
      .single();

    if (saleError || !sale) {
      setError(saleError?.message ?? "Error al crear el documento.");
      setSaving(false);
      return;
    }

    const { error: itemsError } = await supabase.from("sale_items").insert(
      validLines.map((l) => ({
        sale_id: sale.id,
        product_id: l.product_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount: l.discount,
      }))
    );

    if (itemsError) {
      setError(itemsError.message);
      setSaving(false);
      return;
    }

    // Las facturas confirmadas descuentan inventario inmediatamente
    if (docType === "factura") {
      const { error: stockError } = await supabase.rpc("deduct_stock_for_sale", {
        p_sale_id: sale.id,
      });
      if (stockError) {
        setError(`Documento ${sale.number} creado, pero no se pudo descontar inventario: ${stockError.message}`);
        setSaving(false);
        return;
      }
      await supabase.from("sales").update({ status: "confirmado" }).eq("id", sale.id);
    }

    router.push(`/ventas/${sale.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Datos del documento</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Tipo de documento" required>
              <Select value={docType} onChange={(e) => setDocType(e.target.value as SaleDocType)}>
                <option value="cotizacion">Cotización</option>
                <option value="pedido">Pedido</option>
                <option value="factura">Factura</option>
              </Select>
            </Field>
            <Field label="Cliente" required className="sm:col-span-2">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">Selecciona un cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company ? `${c.company} (${c.name})` : c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Almacén de despacho">
              <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Notas" className="sm:col-span-2">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condiciones, observaciones..." />
            </Field>
          </CardContent>
        </Card>

        {/* Totales */}
        <Card>
          <CardHeader><CardTitle>Totales</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Descuento (%)</span>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="h-8 w-24 text-right"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Descuento</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                −{formatCurrency(totals.discountAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-muted">
                <input
                  type="checkbox"
                  checked={applyTax}
                  onChange={(e) => setApplyTax(e.target.checked)}
                  className="h-4 w-4 rounded accent-brand-600"
                />
                ITBIS ({taxRate}%)
              </label>
              <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-base">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-brand-700 dark:text-brand-300">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Líneas de productos */}
      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <Button type="button" variant="secondary" size="sm" onClick={addLine}>
            <Plus className="h-4 w-4" /> Agregar producto
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              Agrega productos al documento con el botón de arriba.
            </p>
          )}
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 items-end gap-2">
              <Field label={i === 0 ? "Producto" : ""} className="col-span-12 sm:col-span-5">
                <Select
                  value={line.product_id}
                  onChange={(e) => updateLine(i, { product_id: e.target.value })}
                  required
                >
                  <option value="">Selecciona producto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={i === 0 ? "Cantidad" : ""} className="col-span-3 sm:col-span-2">
                <Input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label={i === 0 ? "Precio unit." : ""} className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unit_price}
                  onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })}
                />
              </Field>
              <Field label={i === 0 ? "Desc. línea" : ""} className="col-span-3 sm:col-span-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.discount}
                  onChange={(e) => updateLine(i, { discount: Number(e.target.value) })}
                />
              </Field>
              <div className="col-span-2 flex h-10 items-center justify-end gap-2 sm:col-span-1">
                <span className="hidden text-sm font-medium sm:block">
                  {formatCurrency(line.quantity * line.unit_price - line.discount)}
                </span>
                <button
                  type="button"
                  onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
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
          {docType === "factura" ? "Facturar" : docType === "pedido" ? "Crear pedido" : "Crear cotización"}
        </Button>
      </div>
    </form>
  );
}
