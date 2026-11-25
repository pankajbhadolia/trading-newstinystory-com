"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Decimal } from "decimal.js";
import { z } from "zod";
import { Button } from "@/components/ui/button";

export async function api<T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try { const parsed = z.object({ error: z.string() }).safeParse(await response.json()); if (parsed.success) message = parsed.data.error; } catch { /* Response was not JSON. */ }
    throw new Error(message);
  }
  if (response.status === 204) return schema.parse(null);
  return schema.parse(await response.json());
}

export function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const rounded = new Decimal(value).toFixed(2);
  const negative = rounded.startsWith("-");
  const [whole, fraction] = (negative ? rounded.slice(1) : rounded).split(".");
  const last = whole.slice(-3);
  const first = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${negative ? "−" : ""}₹${first ? `${first},` : ""}${last}.${fraction}`;
}

export function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function subscribeToLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

export function useUrlSearch() {
  return useSyncExternalStore(subscribeToLocation, () => window.location.search, () => "");
}

const screenshotSchema = z.object({ id: z.string(), name: z.string(), mimeType: z.string() });
type Screenshot = z.infer<typeof screenshotSchema>;

export function Screenshots({ kind, id }: { kind: "trade" | "review"; id: string }) {
  const [items, setItems] = useState<Screenshot[]>([]);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api(`/api/journal/screenshots?${new URLSearchParams({ kind, id })}`, z.object({ screenshots: z.array(screenshotSchema) }))
      .then((data) => { if (active) setItems(data.screenshots); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load screenshots."); });
    return () => { active = false; };
  }, [kind, id, version]);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Screenshot must not exceed 5 MB."); return; }
    const body = new FormData();
    body.set("kind", kind); body.set("id", id); body.set("file", file);
    setBusy(true); setError("");
    try { await api("/api/journal/screenshots", screenshotSchema, { method: "POST", body }); setVersion((value) => value + 1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed."); }
    finally { setBusy(false); }
  }

  async function remove(image: Screenshot) {
    if (!window.confirm(`Delete ${image.name}?`)) return;
    setError("");
    try { await api(`/api/journal/screenshots/${encodeURIComponent(image.id)}`, z.null(), { method: "DELETE" }); setVersion((value) => value + 1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Deletion failed."); }
  }

  return <section className="journal-screenshots"><h3>Screenshots</h3><p>Private PNG, JPEG or WebP; maximum 5 MB each, five per record.</p>
    <label className="journal-upload">Add screenshot<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || items.length >= 5} onChange={(event) => void upload(event)} /></label>
    {error && <p className="calculator-error" role="alert">{error}</p>}
    <ul>{items.map((image) => <li key={image.id}><a className="text-link" href={`/api/journal/screenshots/${encodeURIComponent(image.id)}`} target="_blank" rel="noreferrer">{image.name}</a> <Button variant="secondary" onClick={() => void remove(image)}>Delete</Button></li>)}</ul>
  </section>;
}
