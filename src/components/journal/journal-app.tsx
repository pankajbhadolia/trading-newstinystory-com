"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { AccountForm, authClient } from "@/components/account-form";
import { Button } from "@/components/ui/button";
import { api } from "@/components/journal/shared";
import { Trades } from "@/components/journal/trades";
import { Rules } from "@/components/journal/rules";
import { Reviews } from "@/components/journal/reviews";

export type JournalTab = "trades" | "rules" | "reviews";

export function JournalApp({ initialTab = "trades" }: { initialTab?: JournalTab }) {
  const [tab, setTab] = useState<JournalTab>(initialTab);
  const [state, setState] = useState<"loading" | "signed-out" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [check, setCheck] = useState(0);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    api("/api/journal/rules", z.object({ rules: z.array(z.unknown()) })).then(() => { if (active) setState("ready"); }).catch((cause: unknown) => {
      if (!active) return;
      if (cause instanceof Error && cause.message === "Sign in to access your journal.") setState("signed-out");
      else { setError(cause instanceof Error ? cause.message : "Could not load journal."); setState("error"); }
    });
    return () => { active = false; };
  }, [check]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function changeTab(next: JournalTab) {
    if (next === tab) return;
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setDirty(false);
    setTab(next);
  }

  async function signOut() {
    if (dirty && !window.confirm("Discard unsaved changes and sign out?")) return;
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Could not sign out.");
      setDirty(false);
      setState("signed-out");
    } catch { setError("Could not sign out. Please try again."); }
  }

  if (state === "loading") return <p role="status">Loading journal…</p>;
  if (state === "signed-out") return <><p>Sign in to access your private journal and discipline records.</p><AccountForm onSuccess={() => { setState("loading"); setCheck((value) => value + 1); }} /></>;
  if (state === "error") return <><p className="calculator-error" role="alert">{error}</p><Button onClick={() => { setState("loading"); setCheck((value) => value + 1); }}>Try again</Button></>;
  return <div className="journal-app">
    <div className="journal-tabs" aria-label="Journal sections">
      <Button variant={tab === "trades" ? "primary" : "secondary"} onClick={() => changeTab("trades")}>Trades</Button>
      <Button variant={tab === "rules" ? "primary" : "secondary"} onClick={() => changeTab("rules")}>Rules &amp; checklists</Button>
      <Button variant={tab === "reviews" ? "primary" : "secondary"} onClick={() => changeTab("reviews")}>Daily review</Button>
      <Button variant="secondary" onClick={() => void signOut()}>Sign out</Button>
    </div>
    {error && <p className="calculator-error" role="alert">{error}</p>}
    {tab === "trades" ? <Trades dirty={dirty} onDirtyChange={setDirty} /> : tab === "rules" ? <Rules dirty={dirty} onDirtyChange={setDirty} /> : <Reviews onDirtyChange={setDirty} />}
  </div>;
}
