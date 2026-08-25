"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { AuthShell, AuthField, AuthError } from "@/components/auth/AuthForm";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    if (res?.error) {
      // Deliberately vague: saying which half was wrong tells an attacker
      // whether an email is registered.
      setError("Correo o contraseña incorrectos");
      setBusy(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell
      title="Bienvenido de vuelta"
      subtitle="Entra para ver tus cuentas y movimientos."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-accent hover:brightness-125">
            Crear una
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
        <AuthField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <AuthError>{error}</AuthError>}

        <Button type="submit" size="lg" loading={busy} className="w-full py-3.5">
          Entrar
        </Button>
      </form>
    </AuthShell>
  );
}
