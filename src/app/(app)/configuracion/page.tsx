import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { CatalogManager } from "@/components/settings/catalog-manager";
import type { Brand, Category, CompanySettings, Warehouse } from "@/lib/types";

export const metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

/** MÓDULO 9 — Configuración: empresa, impuestos, almacenes y catálogos. */
export default async function SettingsPage() {
  const supabase = await createClient();

  const [settingsRes, warehousesRes, brandsRes, categoriesRes] = await Promise.all([
    supabase.from("company_settings").select("*").single(),
    supabase.from("warehouses").select("*").order("name"),
    supabase.from("brands").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
  ]);

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Datos de la empresa, impuestos, almacenes, marcas y categorías"
      />
      <div className="space-y-6">
        <SettingsForm settings={settingsRes.data as CompanySettings} />
        <CatalogManager
          warehouses={(warehousesRes.data ?? []) as Warehouse[]}
          brands={(brandsRes.data ?? []) as Brand[]}
          categories={(categoriesRes.data ?? []) as Category[]}
        />
      </div>
    </>
  );
}
