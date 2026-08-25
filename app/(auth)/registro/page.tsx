"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { AuthShell, AuthField, AuthError } from "@/components/auth/AuthForm";

const MIN_PASSWORD = 8;

export default function RegistroPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(payload?.error ?? "No se pudo crear la cuenta");
        setBusy(false);
        return;
      }

      // Straight in — asking someone to log in right after signing up is a
      // step with no purpose.
      await signIn("credentials", { email: email.trim(), password, redirect: false });
      router.push("/bienvenida");
      router.refresh();
    } catch {
      setError("Sin conexión. Revisa tu red e inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Lleva el control de tus gastos en un par de minutos."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-accent hover:brightness-125">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField
          label="Nombre"
          autoComplete="given-name"
          placeholder="Cómo te llamas"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <AuthField
          label="Correo"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="space-y-1.5">
          <AuthField
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {tooShort && (
            <p className="font-mono text-[10.5px] text-amber-fg">
              Te faltan {MIN_PASSWORD - password.length} caracteres
            </p>
          )}
        </div>

        {error && <AuthError>{error}</AuthError>}

        <Button
          type="submit"
          size="lg"
          loading={busy}
          disabled={password.length < MIN_PASSWORD}
          className="w-full py-3.5"
        >
          Crear cuenta
        </Button>
      </form>
    </AuthShell>
  );
}
