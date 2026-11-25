"use client";

import { useState } from "react";
import { createAuthClient } from "better-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const authClient = createAuthClient();

export function AccountForm({ initialMode = "login", onSuccess }: { initialMode?: "login" | "sign-up"; onSuccess?: () => void }) {
  const [mode, setMode] = useState<"login" | "sign-up" | "recovery" | "verification">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const callbackURL = new URL("/login", window.location.origin).toString();
      const result = mode === "login" ? await authClient.signIn.email({ email, password })
        : mode === "sign-up" ? await authClient.signUp.email({ name, email, password, callbackURL })
        : mode === "recovery" ? await authClient.requestPasswordReset({ email, redirectTo: new URL("/reset-password", window.location.origin).toString() })
        : await authClient.sendVerificationEmail({ email, callbackURL });
      if (result.error) {
        setMessage(result.error.message || "Account request failed.");
      } else {
        setPassword("");
        if (mode === "login") { setMessage("Signed in successfully."); onSuccess?.(); }
        else setMessage(mode === "sign-up" ? "Check your email for a verification link before signing in. If it does not arrive, use Resend verification." : "If this address is eligible, an email has been sent.");
      }
    } catch {
      setMessage("Account service is unavailable. Please try again later.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="account-form">
    <h2>{mode === "login" ? "Sign in" : mode === "sign-up" ? "Create an account" : mode === "recovery" ? "Recover password" : "Resend verification"}</h2>
    <p>Verify your email before signing in. Accounts remain a development preview; do not use real sensitive data.</p>
    <form onSubmit={submit}>
      {mode === "sign-up" && <label>Display name<Input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}
      <label>Email<Input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
      {(mode === "login" || mode === "sign-up") && <label>Password<Input required type="password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}
      <Button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send email"}</Button>
    </form>
    <p role="status">{message}</p>
    <div className="journal-actions">
      {mode !== "login" && <button className="text-link" type="button" onClick={() => { setMode("login"); setMessage(""); }}>Sign in</button>}
      {mode === "login" && <><button className="text-link" type="button" onClick={() => { setMode("sign-up"); setMessage(""); }}>Need an account? Sign up</button><button className="text-link" type="button" onClick={() => { setMode("recovery"); setMessage(""); }}>Forgot password?</button><button className="text-link" type="button" onClick={() => { setMode("verification"); setMessage(""); }}>Resend verification</button></>}
    </div>
  </div>;
}
