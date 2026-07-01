"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import type { CompanySettings } from "@/lib/types";

/** Configuración de la empresa (Módulo 9): datos fiscales, moneda, ITBIS y logo. */
export function SettingsForm({ settings }: { settings: CompanySettings }) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: settings?.name ?? "TSUNAMI IMPORT, SRL",
    rnc: settings?.rnc ?? "",
    address: settings?.address ?? "",
    city: settings?.city ?? "",
    province: settings?.province ?? "",
    phone: settings?.phone ?? "",
    whatsapp: settings?.whatsapp ?? "",
    email: settings?.email ?? "",
    currency: settings?.currency ?? "DOP",
    currency_symbol: settings?.currency_symbol ?? "RD$",
    tax_name: settings?.tax_name ?? "ITBIS",
    tax_rate: settings?.tax_rate ?? 18,
    quote_validity_days: settings?.quote_validity_days ?? 15,
    low_stock_threshold: settings?.low_stock_threshold ?? 10,
  });
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function uploadLogo(file: File) {
    const path = `logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("company").upload(path, file, { upsert: true });
    if (error) {
      setMessage(`Error al subir el logo: ${error.message}`);
      return;
    }
    const { data } = supabase.storage.from("company").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from("company_settings")
      .update({
        ...form,
        tax_rate: Number(form.tax_rate),
        quote_validity_days: Number(form.quote_validity_days),
        low_stock_threshold: Number(form.low_stock_threshold),
        logo_url: logoUrl || null,
      })
      .eq("id", 1);

    setSaving(false);
    setMessage(error ? `Error: ${error.message}` : "Configuración guardada correctamente.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Datos de la empresa</CardTitle>
          <Button type="submit" size="sm" loading={saving}>Guardar cambios</Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo */}
          <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
            <label className="group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-hover transition-colors hover:border-brand-400">
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" sizes="80px" />
              ) : (
                <ImagePlus className="h-6 w-6 text-muted group-hover:text-brand-500" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              />
            </label>
            <div>
              <p className="text-sm font-medium">Logo de la empresa</p>
              <p className="text-xs text-muted">PNG o JPG. Se muestra en documentos e impresiones.</p>
            </div>
          </div>

          <Field label="Nombre / Razón social" className="sm:col-span-2">
            <Input value={form.name} onChange={set("name")} required />
          </Field>
          <Field label="RNC">
            <Input value={form.rnc} onChange={set("rnc")} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Dirección" className="sm:col-span-2">
            <Input value={form.address} onChange={set("address")} />
          </Field>
          <Field label="Ciudad">
            <Input value={form.city} onChange={set("city")} />
          </Field>
          <Field label="Provincia">
            <Input value={form.province} onChange={set("province")} />
          </Field>
          <Field label="WhatsApp">
            <Input value={form.whatsapp} onChange={set("whatsapp")} />
          </Field>
          <Field label="Correo">
            <Input type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Moneda">
            <Input value={form.currency} onChange={set("currency")} />
          </Field>
          <Field label="Símbolo">
            <Input value={form.currency_symbol} onChange={set("currency_symbol")} />
          </Field>
          <Field label="Impuesto">
            <Input value={form.tax_name} onChange={set("tax_name")} />
          </Field>
          <Field label="Tasa de impuesto (%)">
            <Input type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={set("tax_rate")} />
          </Field>
          <Field label="Vigencia de cotizaciones (días)">
            <Input type="number" min="1" value={form.quote_validity_days} onChange={set("quote_validity_days")} />
          </Field>
          <Field label="Inventario mínimo por defecto">
            <Input type="number" min="0" value={form.low_stock_threshold} onChange={set("low_stock_threshold")} />
          </Field>
        </CardContent>
        {message && (
          <p className="px-5 pb-4 text-sm text-muted">{message}</p>
        )}
      </Card>
    </form>
  );
}
