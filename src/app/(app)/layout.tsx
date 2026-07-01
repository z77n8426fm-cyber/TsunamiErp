import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import type { Profile } from "@/lib/types";

/**
 * Layout de las rutas privadas: verifica la sesión, carga el perfil del
 * usuario (incluido su rol) y monta la estructura sidebar + topbar.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || !profile.is_active) redirect("/login");

  return <AppShell profile={profile}>{children}</AppShell>;
}
