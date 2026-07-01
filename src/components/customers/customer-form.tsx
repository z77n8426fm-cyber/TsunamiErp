"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PROVINCES_DO } from "@/lib/constants";
import type { Customer } from "@/lib/types";

/** Formulario de creación/edición de clientes (Módulo 4). */
export function CustomerForm({ customer }: { customer?: Customer }) {
  const router = useRouter();
  const isEdit = Boolean(customer);

  const [form, setForm] = useState({
    name: customer?.name ?? "",
    company: customer?.company ?? "",
    rnc: customer?.rnc ?? "",
    address: customer?.address ?? "",
    city: customer?.city ?? "",
    province: customer?.province ?? "",
    country: customer?.country ?? "República Dominicana",
    phone: customer?.phone ?? "",
    whatsapp: customer?.whatsapp ?? "",
    email: customer?.email ?? "",
    instagram: customer?.instagram ?? "",
    credit_limit: customer?.credit_limit ?? 0,
    notes: customer?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const payload = { ...form, credit_limit: Number(form.credit_limit) };

    const result = isEdit
      ? await supabase.from("customers").update(payload).eq("id", customer!.id).select("id").single()
      : await supabase.from("customers").insert(payload).select("id").single();

    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.push(`/clientes/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Datos generales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre" required>
              <Input value={form.name} onChange={set("name")} required placeholder="Juan Pérez" />
            </Field>
            <Field label="Empresa">
              <Input value={form.company} onChange={set("company")} placeholder="Tienda La Económica" />
            </Field>
            <Field label="RNC">
              <Input value={form.rnc} onChange={set("rnc")} placeholder="1-31-12345-6" />
            </Field>
            <Field label="Límite de crédito (RD$)">
              <Input type="number" min="0" step="0.01" value={form.credit_limit} onChange={set("credit_limit")} />
            </Field>
            <Field label="Dirección" className="sm:col-span-2">
              <Input value={form.address} onChange={set("address")} placeholder="Calle, número, sector" />
            </Field>
            <Field label="Ciudad">
              <Input value={form.city} onChange={set("city")} placeholder="Santo Domingo" />
            </Field>
            <Field label="Provincia">
              <Select value={form.province} onChange={set("province")}>
                <option value="">Selecciona provincia</option>
                {PROVINCES_DO.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="País" className="sm:col-span-2">
              <Input value={form.country} onChange={set("country")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contacto</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Teléfono">
              <Input value={form.phone} onChange={set("phone")} placeholder="809-555-1234" />
            </Field>
            <Field label="WhatsApp">
              <Input value={form.whatsapp} onChange={set("whatsapp")} placeholder="18095551234" />
            </Field>
            <Field label="Correo electrónico">
              <Input type="email" value={form.email} onChange={set("email")} placeholder="cliente@correo.com" />
            </Field>
            <Field label="Instagram">
              <Input value={form.instagram} onChange={set("instagram")} placeholder="@usuario" />
            </Field>
            <Field label="Notas" className="sm:col-span-2">
              <Textarea value={form.notes} onChange={set("notes")} placeholder="Observaciones internas..." />
            </Field>
          </CardContent>
        </Card>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" loading={saving}>{isEdit ? "Guardar cambios" : "Crear cliente"}</Button>
      </div>
    </form>
  );
}
