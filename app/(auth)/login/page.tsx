"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { AuthShell, AuthField, AuthError } from "@/components/auth/AuthForm";
import { useT } from "@/lib/i18n-react";

export default function LoginPage() {
  const t = useT();
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
      setError(t.auth.badCredentials);
      setBusy(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell
      title={t.auth.signInTitle}
      subtitle={t.auth.signInSubtitle}
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
          label={t.auth.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t.auth.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthField
          label={t.auth.password}
          type="password"
          autoComplete="current-password"
          placeholder={t.auth.passwordPlaceholder}
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
