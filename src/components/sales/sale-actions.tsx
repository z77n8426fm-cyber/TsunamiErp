"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileCheck, Mail, MessageCircle, Printer, Receipt, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, SALE_STATUS_LABELS } from "@/lib/constants";
import type { Customer, PaymentMethod, Sale, SaleStatus } from "@/lib/types";

/**
 * Acciones sobre un documento de venta (Módulo 5):
 * cambiar estado, convertir a factura, registrar pagos, compartir por
 * WhatsApp o correo, e imprimir.
 */
export function SaleActions({
  sale,
  companyName,
}: {
  sale: Sale & { customer: Customer };
  companyName: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payAmount, setPayAmount] = useState(Number(sale.total) - Number(sale.paid_amount));
  const [payMethod, setPayMethod] = useState<PaymentMethod>("efectivo");
  const [payReference, setPayReference] = useState("");

  const pending = Number(sale.total) - Number(sale.paid_amount);

  /** Mensaje resumen del documento para WhatsApp / correo. */
  const shareText = [
    `*${companyName}*`,
    `${sale.doc_type === "cotizacion" ? "Cotización" : sale.doc_type === "pedido" ? "Pedido" : "Factura"} ${sale.number}`,
    ``,
    ...(sale.items ?? []).map(
      (i) => `• ${i.quantity} x ${i.product?.name ?? ""} — ${formatCurrency(Number(i.total))}`
    ),
    ``,
    `Total: *${formatCurrency(Number(sale.total))}*`,
    sale.valid_until ? `Válida hasta: ${new Date(sale.valid_until).toLocaleDateString("es-DO")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappHref = sale.customer.whatsapp
    ? `https://wa.me/${sale.customer.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(shareText)}`
    : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const mailHref = `mailto:${sale.customer.email ?? ""}?subject=${encodeURIComponent(
    `${sale.number} — ${companyName}`
  )}&body=${encodeURIComponent(shareText.replaceAll("*", ""))}`;

  async function changeStatus(status: SaleStatus) {
    setBusy(true);
    await supabase.from("sales").update({ status }).eq("id", sale.id);
    setBusy(false);
    router.refresh();
  }

  /** Convierte una cotización o pedido en factura nueva y descuenta stock. */
  async function convertToInvoice() {
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();

    const { data: invoice, error } = await supabase
      .from("sales")
      .insert({
        doc_type: "factura",
        status: "confirmado",
        customer_id: sale.customer_id,
        warehouse_id: sale.warehouse_id,
        subtotal: sale.subtotal,
        discount_percent: sale.discount_percent,
        discount_amount: sale.discount_amount,
        tax_amount: sale.tax_amount,
        total: sale.total,
        notes: `Generada desde ${sale.number}`,
        created_by: userData.user?.id,
      })
      .select("id")
      .single();

    if (error || !invoice) {
      setBusy(false);
      alert(error?.message ?? "No se pudo crear la factura.");
      return;
    }

    await supabase.from("sale_items").insert(
      (sale.items ?? []).map((i) => ({
        sale_id: invoice.id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount: i.discount,
      }))
    );

    const { error: stockError } = await supabase.rpc("deduct_stock_for_sale", {
      p_sale_id: invoice.id,
    });
    if (stockError) {
      alert(`Factura creada, pero no se descontó inventario: ${stockError.message}`);
    }

    await supabase.from("sales").update({ status: "confirmado" }).eq("id", sale.id);

    setBusy(false);
    router.push(`/ventas/${invoice.id}`);
    router.refresh();
  }

  async function registerPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("payments").insert({
      sale_id: sale.id,
      customer_id: sale.customer_id,
      amount: payAmount,
      method: payMethod,
      reference: payReference || null,
      received_by: userData.user?.id,
    });

    if (!error) {
      await supabase
        .from("sales")
        .update({ paid_amount: Number(sale.paid_amount) + payAmount })
        .eq("id", sale.id);
      setPayOpen(false);
    } else {
      alert(error.message);
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Estado */}
      <Select
        value={sale.status}
        onChange={(e) => changeStatus(e.target.value as SaleStatus)}
        disabled={busy}
        className="h-10 w-40"
      >
        {Object.entries(SALE_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>

      {sale.doc_type !== "factura" && sale.status !== "cancelado" && (
        <Button variant="secondary" onClick={convertToInvoice} loading={busy}>
          <FileCheck className="h-4 w-4" /> Facturar
        </Button>
      )}

      {sale.doc_type === "factura" && pending > 0 && (
        <Button variant="secondary" onClick={() => setPayOpen(true)}>
          <Receipt className="h-4 w-4" /> Registrar pago
        </Button>
      )}

      <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
        <Button variant="outline">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </Button>
      </a>

      <a href={mailHref}>
        <Button variant="outline">
          <Mail className="h-4 w-4" /> Correo
        </Button>
      </a>

      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Imprimir
      </Button>

      {/* Diálogo de pago */}
      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Registrar pago</h2>
              <button
                onClick={() => setPayOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-hover"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={registerPayment} className="space-y-4">
              <p className="rounded-lg bg-surface-hover px-3 py-2 text-sm">
                Pendiente: <span className="font-semibold">{formatCurrency(pending)}</span>
              </p>
              <Field label="Monto recibido" required>
                <Input
                  type="number"
                  min="0.01"
                  max={pending}
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  required
                />
              </Field>
              <Field label="Método de pago" required>
                <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Referencia (opcional)">
                <Input
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="Núm. de transferencia, cheque..."
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={busy}>Guardar recibo</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
