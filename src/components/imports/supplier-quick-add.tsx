"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

/** Alta rápida de proveedores desde el módulo de importaciones. */
export function SupplierQuickAdd() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    country: "China",
    contact_name: "",
    email: "",
    phone: "",
    wechat: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.from("suppliers").insert(form);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    setForm({ name: "", country: "China", contact_name: "", email: "", phone: "", wechat: "" });
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Nuevo proveedor
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuevo proveedor</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-hover"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Nombre" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Guangzhou Textile Co."
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="País">
                  <Input
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="China / India"
                  />
                </Field>
                <Field label="Contacto">
                  <Input
                    value={form.contact_name}
                    onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                  />
                </Field>
                <Field label="Correo">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </Field>
                <Field label="Teléfono">
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </Field>
                <Field label="WeChat" className="col-span-2">
                  <Input
                    value={form.wechat}
                    onChange={(e) => setForm((f) => ({ ...f, wechat: e.target.value }))}
                  />
                </Field>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" loading={saving}>Guardar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
