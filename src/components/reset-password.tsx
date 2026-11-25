"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/components/account-form";
import { useUrlSearch } from "@/components/journal/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPassword() {
  const params = new URLSearchParams(useUrlSearch());
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) { setMessage("The reset link is invalid or expired."); return; }
    setBusy(true); setMessage("");
    try {
      const result = await authClient.resetPassword({ token, newPassword: password });
      if (result.error) throw new Error(result.error.message || "Could not reset password.");
      setPassword(""); setMessage("Password updated. Sign in with your new password.");
      window.history.replaceState(null, "", "/reset-password");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not reset password."); }
    finally { setBusy(false); }
  }
  return <div className="account-form"><h1>Reset password</h1><p>Use the link from your recovery email. Resetting your password signs out your other sessions.</p>
    <form onSubmit={submit}><label>New password<Input type="password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label><Button disabled={busy} type="submit">Reset password</Button></form>
    <p role="status">{message}</p><Link className="text-link" href="/login">Back to sign in</Link>
  </div>;
}
