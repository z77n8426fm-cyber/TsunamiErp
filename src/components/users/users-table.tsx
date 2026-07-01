"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import type { Profile, UserRole } from "@/lib/types";

/**
 * Tabla de usuarios (Módulo 8): el administrador asigna roles y
 * activa/desactiva cuentas. No puede desactivarse a sí mismo.
 */
export function UsersTable({ users, currentUserId }: { users: Profile[]; currentUserId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateRole(id: string, role: UserRole) {
    setBusyId(id);
    await supabase.from("profiles").update({ role }).eq("id", id);
    setBusyId(null);
    router.refresh();
  }

  async function toggleActive(profile: Profile) {
    setBusyId(profile.id);
    await supabase.from("profiles").update({ is_active: !profile.is_active }).eq("id", profile.id);
    setBusyId(null);
    router.refresh();
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Usuario</TH>
          <TH>Correo</TH>
          <TH>Rol</TH>
          <TH>Registrado</TH>
          <TH>Estado</TH>
        </TR>
      </THead>
      <TBody>
        {users.map((u) => (
          <TR key={u.id}>
            <TD>
              <p className="font-medium">{u.full_name}</p>
              {u.id === currentUserId && <p className="text-xs text-brand-500">Tú</p>}
            </TD>
            <TD className="text-muted">{u.email}</TD>
            <TD>
              <Select
                value={u.role}
                onChange={(e) => updateRole(u.id, e.target.value as UserRole)}
                disabled={busyId === u.id || u.id === currentUserId}
                className="h-9 w-40"
              >
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </Select>
            </TD>
            <TD className="text-muted">{formatDate(u.created_at)}</TD>
            <TD>
              <button
                onClick={() => toggleActive(u)}
                disabled={busyId === u.id || u.id === currentUserId}
                className="disabled:cursor-not-allowed disabled:opacity-60"
                title={u.id === currentUserId ? "No puedes desactivar tu propia cuenta" : "Cambiar estado"}
              >
                {u.is_active ? (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400">
                    Activo
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400">
                    Inactivo
                  </Badge>
                )}
              </button>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
