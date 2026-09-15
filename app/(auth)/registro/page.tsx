"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { AuthShell, AuthField, AuthError } from "@/components/auth/AuthForm";
import { useT } from "@/lib/i18n-react";

const MIN_PASSWORD = 8;

export default function RegistroPage() {
  const t = useT();
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
        setError(payload?.error ?? t.auth.signUpFailed);
        setBusy(false);
        return;
      }

      // Straight in — asking someone to log in right after signing up is a
      // step with no purpose.
      await signIn("credentials", { email: email.trim(), password, redirect: false });
      router.push("/bienvenida");
      router.refresh();
    } catch {
      setError(t.common.offline);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={t.auth.signUpTitle}
      subtitle={t.auth.signUpSubtitle}
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
          label={t.common.name}
          autoComplete="given-name"
          placeholder={t.auth.yourName}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
        <div className="space-y-1.5">
          <AuthField
            label={t.auth.password}
            type="password"
            autoComplete="new-password"
            placeholder={t.auth.passwordHint}
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
