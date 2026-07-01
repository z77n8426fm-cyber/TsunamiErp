import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { UsersTable } from "@/components/users/users-table";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

/** MÓDULO 8 — Usuarios y roles (solo administradores). */
export default async function UsersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  if (me?.role !== "admin") redirect("/dashboard");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios y permisos por rol. Los usuarios se registran desde la pantalla de acceso y aquí se les asigna su rol."
      />
      <Card>
        <CardContent className="p-0">
          <UsersTable users={(data ?? []) as Profile[]} currentUserId={user!.id} />
        </CardContent>
      </Card>
    </>
  );
}
