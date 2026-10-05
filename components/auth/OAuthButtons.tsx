"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/components/auth/AuthForm";
import { useT } from "@/lib/i18n-react";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3a7.2 7.2 0 0 1-10.7-3.78H1.36v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.37 14.31a7.2 7.2 0 0 1 0-4.62v-3.1H1.36a12 12 0 0 0 0 10.82l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.36 6.59l4.01 3.1A7.2 7.2 0 0 1 12 4.77Z" />
    </svg>
  );
}

/** Auth.js sends a failed attempt back as `/login?error=<code>`. */
function useOAuthError(): string | null {
  const t = useT();
  const code = useSearchParams().get("error");
  if (!code) return null;
  if (code === "EmailNotVerified") return t.auth.oauthEmailNotVerified;
  if (code === "NoEmail") return t.auth.oauthNoEmail;
  return t.auth.oauthFailed;
}

function Inner() {
  const t = useT();
  const error = useOAuthError();
  const [busy, setBusy] = useState(false);

  async function google() {
    if (busy) return;
    setBusy(true);
    // Leaves the app for Google and comes back to "/": the (app) layout sends
    // a brand-new user on to /bienvenida.
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <div className="space-y-4">
      {error && <AuthError>{error}</AuthError>}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        loading={busy}
        onClick={google}
        className="w-full py-3.5 gap-2.5"
      >
        <GoogleMark />
        {t.auth.continueGoogle}
      </Button>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-faint">{t.auth.or}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

export function OAuthButtons() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
