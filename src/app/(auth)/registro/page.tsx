"use client";

import { useState } from "react";
import Link from "next/link";
import { Waves } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

/**
 * Registro de usuarios. El primer usuario creado recibe rol de administrador
 * automáticamente (trigger handle_new_user); los siguientes entran como
 * "ventas" hasta que un administrador les asigne su rol definitivo.
 */
export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center text-white">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <Waves className="h-7 w-7 text-brand-300" />
          </span>
          <h1 className="text-2xl font-bold tracking-wide">TSUNAMI IMPORT</h1>
          <p className="mt-1 text-sm text-brand-200">Crear cuenta de usuario</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface p-6 shadow-2xl sm:p-8">
          {done ? (
            <div className="space-y-4 text-center">
              <h2 className="text-lg font-semibold">Cuenta creada</h2>
              <p className="text-sm text-muted">
                Revisa tu correo para confirmar la cuenta y luego inicia sesión.
              </p>
              <Link href="/login">
                <Button className="w-full">Ir a iniciar sesión</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Nombre completo" required>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                />
              </Field>
              <Field label="Correo electrónico" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@tsunamiimport.com"
                  required
                />
              </Field>
              <Field label="Contraseña" required>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                />
              </Field>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Crear cuenta
              </Button>

              <p className="text-center text-sm text-muted">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                  Inicia sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
