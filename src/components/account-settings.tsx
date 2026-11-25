"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { AccountForm, authClient } from "@/components/account-form";
import { api, jsonRequest } from "@/components/journal/shared";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { resolveTheme, themes } from "@/config/themes";

const tier = z.enum(["FREE", "PRO", "PREMIUM"]);
const settingsSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), email: z.string(), emailVerified: z.boolean(), preference: z.object({ theme: z.string() }).nullable() }),
  access: z.object({ subscriptionTier: tier, effectiveTier: tier, legacy: z.boolean(), cutoff: z.string().nullable(), legacyUntil: z.string().nullable(), subscription: z.object({ tier, expiresAt: z.string(), source: z.string() }).nullable() }),
  features: z.array(z.object({ id: z.string(), title: z.string(), required: tier, available: z.boolean(), enabled: z.boolean(), limit: z.number().nullable(), unit: z.string().nullable() })),
  history: z.array(z.object({ id: z.string(), tier, expiresAt: z.string(), action: z.string(), source: z.string(), createdAt: z.string() })),
  requests: z.array(z.object({ id: z.string(), tier, status: z.string(), createdAt: z.string(), resolvedAt: z.string().nullable() })),
});
type Settings = z.infer<typeof settingsSchema>;

export function AccountSettings() {
  const [settings, setSettings] = useState<Settings>();
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("corporate-light");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "login" | "error">("loading");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api("/api/account", settingsSchema);
      setSettings(result); setName(result.user.name); setTheme(resolveTheme(result.user.preference?.theme)); setState("ready");
    } catch (error) {
      if (error instanceof Error && error.message === "Sign in to access your journal.") setState("login");
      else { setMessage(error instanceof Error ? error.message : "Could not load account."); setState("error"); }
    }
  }, []);
  useEffect(() => {
    let active = true;
    api("/api/account", settingsSchema).then((result) => {
      if (!active) return;
      setSettings(result); setName(result.user.name); setTheme(resolveTheme(result.user.preference?.theme)); setState("ready");
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof Error && error.message === "Sign in to access your journal.") setState("login");
      else { setMessage(error instanceof Error ? error.message : "Could not load account."); setState("error"); }
    });
    return () => { active = false; };
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await api("/api/account", z.object({ saved: z.literal(true) }), jsonRequest("PUT", { name, theme }));
      try {
        localStorage.setItem("traders-command-centre-theme", theme);
        document.documentElement.dataset.theme = theme;
        window.dispatchEvent(new Event("account-theme-change"));
        setMessage("Profile and preference saved.");
      } catch { setMessage("Profile saved, but this browser could not apply the theme."); }
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save profile."); }
    finally { setBusy(false); }
  }
  async function requestUpgrade(target: "PRO" | "PREMIUM") {
    setBusy(true); setMessage("");
    try { await api("/api/account/upgrades", z.object({ id: z.string() }), jsonRequest("POST", { tier: target })); await load(); setMessage("Upgrade requested. No payment was collected; an operator must approve it."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not request an upgrade."); }
    finally { setBusy(false); }
  }
  async function cancel(id: string) {
    setBusy(true); setMessage("");
    try { await api("/api/account/upgrades", z.object({ cancelled: z.literal(true) }), jsonRequest("DELETE", { id })); await load(); setMessage("Request cancelled."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not cancel request."); }
    finally { setBusy(false); }
  }
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (result.error) throw new Error(result.error.message || "Could not change password.");
      setCurrentPassword(""); setNewPassword(""); setMessage("Password changed; other sessions were signed out.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not change password."); }
    finally { setBusy(false); }
  }
  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Permanently delete your account and all live journal, assessment, subscription and screenshot records? Backups may remain.")) return;
    setBusy(true); setMessage("");
    try {
      const result = await authClient.deleteUser({ password: deletePassword });
      if (result.error) throw new Error(result.error.message || "Could not delete account.");
      setDeletePassword(""); setSettings(undefined); setState("login"); setMessage("Account deleted.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete account."); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setMessage("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Could not sign out.");
      setSettings(undefined); setState("login");
    } catch { setMessage("Could not sign out."); }
    finally { setBusy(false); }
  }
  if (state === "loading") return <p role="status">Loading account…</p>;
  if (state === "login") return <><p role="status">{message}</p><AccountForm onSuccess={() => { setState("loading"); void load(); }} /></>;
  if (state === "error" || !settings) return <><p role="alert">{message}</p><Button onClick={() => { setState("loading"); void load(); }}>Try again</Button></>;
  const pending = settings.requests.find((item) => item.status === "PENDING");
  return <div className="account-settings">
    <p role="status">{message}</p><Button variant="secondary" disabled={busy} onClick={() => void signOut()}>Sign out</Button>
    <section className="ui-card journal-editor"><h2>Profile and preferences</h2><p>{settings.user.email} · {settings.user.emailVerified ? "Email verified" : "Email not verified"}</p>
      <form className="account-settings-form" onSubmit={(event) => void saveProfile(event)}>
        <label>Display name<Input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Saved theme<Select value={theme} onChange={(event) => setTheme(event.target.value)}>{themes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
        <p>Saving also applies this theme to the current browser.</p><Button disabled={busy} type="submit">Save profile</Button>
      </form>
    </section>
    <section className="ui-card journal-editor"><h2>Subscription</h2><p>Current subscription: <strong>{settings.access.subscriptionTier}</strong>{settings.access.subscription && settings.access.subscriptionTier !== "FREE" ? ` · expires ${new Date(settings.access.subscription.expiresAt).toLocaleString()}` : ""}.</p>
      {settings.access.subscription && settings.access.subscriptionTier === "FREE" && <p>Your {settings.access.subscription.tier} subscription expired on {new Date(settings.access.subscription.expiresAt).toLocaleString()}.</p>}
      {settings.access.legacy && <p>Existing preview access: {settings.access.effectiveTier} features {settings.access.legacyUntil ? `until ${new Date(settings.access.legacyUntil).toLocaleString()}` : "until a migration date is configured"}.</p>}
      <p>Free, Pro and Premium have no prices configured. Upgrades are manual requests: no payment is collected and access changes only after an operator approves a request.</p>
      {pending ? <p>Pending request: {pending.tier}. <button className="text-link" disabled={busy} onClick={() => void cancel(pending.id)}>Cancel request</button></p> : <div className="journal-actions">{settings.access.subscriptionTier === "FREE" && <Button disabled={busy} onClick={() => void requestUpgrade("PRO")}>Request Pro</Button>}{settings.access.subscriptionTier !== "PREMIUM" && <Button variant="secondary" disabled={busy} onClick={() => void requestUpgrade("PREMIUM")}>Request Premium</Button>}</div>}
      <h3>Features and limits</h3><div className="risk-table-wrap"><table className="risk-table"><thead><tr><th>Feature</th><th>Required tier</th><th>Availability</th><th>Limit</th></tr></thead><tbody>{settings.features.map((feature) => <tr key={feature.id}><td>{feature.title}</td><td>{feature.required}</td><td>{!feature.available ? "Coming soon" : feature.enabled ? "Available" : "Upgrade required"}</td><td>{!feature.enabled ? "—" : feature.limit === null ? "No configured usage limit" : `${feature.limit} ${feature.unit ?? ""}`}</td></tr>)}</tbody></table></div>
      <h3>Subscription history</h3><p>Showing up to 100 recent events. Expiry falls back to Free automatically.</p>
      {settings.history.length ? <ul>{settings.history.map((item) => <li key={item.id}>{new Date(item.createdAt).toLocaleString()} · {item.action} {item.tier} · expires {new Date(item.expiresAt).toLocaleString()} · {item.source}</li>)}</ul> : <p>No subscription changes yet.</p>}
      <h3>Upgrade requests</h3>{settings.requests.length ? <ul>{settings.requests.map((item) => <li key={item.id}>{new Date(item.createdAt).toLocaleString()} · {item.tier} · {item.status}</li>)}</ul> : <p>No upgrade requests.</p>}
    </section>
    <section className="ui-card journal-editor"><h2>Security and data</h2>
      <form className="account-settings-form" onSubmit={(event) => void changePassword(event)}><label>Current password<Input type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label>New password<Input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><Button disabled={busy} type="submit">Change password</Button></form>
      <h3>Export data</h3><p>Download your complete account data, including older journal history and screenshots, as a sensitive JSON file. Passwords and session tokens are excluded.</p><a className="ui-button ui-button-secondary" href="/api/account/export" download>Export account data</a>
      <h3>Delete account</h3><p>This permanently removes live account data. Existing backups may remain according to the operator&apos;s retention policy.</p><form className="account-settings-form" onSubmit={(event) => void deleteAccount(event)}><label>Password to confirm deletion<Input type="password" required maxLength={128} autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} /></label><Button variant="secondary" disabled={busy} type="submit">Delete account</Button></form>
    </section>
  </div>;
}
