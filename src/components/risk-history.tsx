"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { AccountForm, authClient } from "@/components/account-form";
import { RiskReportView } from "@/components/risk-report";
import { Button } from "@/components/ui/button";
import { reportSchema } from "@/modules/risk/assessment";

const responseSchema = z.object({ reports: z.array(z.object({ id: z.string(), createdAt: z.string(), ruleVersion: z.string(), report: reportSchema })) });
type SavedReport = z.infer<typeof responseSchema>["reports"][number];

async function fetchReports() {
  const response = await fetch("/api/risk/assessments", { cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Could not load assessment history.");
  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("A saved report has an unsupported format. Contact the administrator.");
  return parsed.data.reports;
}

export function RiskHistory() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [selected, setSelected] = useState<string>();
  const [state, setState] = useState<"loading" | "ready" | "login" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const loaded = await fetchReports();
      if (!loaded) { setState("login"); return; }
      setReports(loaded);
      setState("ready");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load assessment history.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchReports().then((loaded) => {
      if (!active) return;
      if (!loaded) { setState("login"); return; }
      setReports(loaded);
      setState("ready");
    }).catch((error: unknown) => {
      if (!active) return;
      setMessage(error instanceof Error ? error.message : "Could not load assessment history.");
      setState("error");
    });
    return () => { active = false; };
  }, []);

  async function remove(id: string) {
    if (!window.confirm("Delete this saved assessment permanently?")) return;
    try {
      const response = await fetch("/api/risk/assessments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error("Could not delete the assessment.");
      setReports((items) => items.filter((item) => item.id !== id));
      setSelected((value) => value === id ? undefined : value);
      setMessage("Assessment deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete the assessment.");
    }
  }

  async function signOut() {
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Could not sign out.");
      setReports([]);
      setSelected(undefined);
      setState("login");
      setMessage("Signed out.");
    } catch {
      setMessage("Could not sign out. Please try again.");
    }
  }

  if (state === "loading") return <p role="status">Loading assessment history…</p>;
  if (state === "login") return <><p>Sign in to view your saved assessments.</p><AccountForm onSuccess={() => { setState("loading"); void load(); }} /></>;
  if (state === "error") return <><p role="alert">{message}</p><Button onClick={() => { setState("loading"); void load(); }}>Try again</Button></>;
  const active = reports.find((report) => report.id === selected);
  return <div className="risk-history">
    <div className="risk-actions"><Button variant="secondary" onClick={signOut}>Sign out</Button></div>
    <p>Compare scores and limits across up to 100 recent snapshots. Different rule versions may not be directly comparable.</p>
    <p role="status">{message}</p>
    {!reports.length ? <p>No saved assessments yet.</p> : <div className="risk-table-wrap"><table className="risk-table"><thead><tr><th>Date</th><th>Rules</th><th>Financial</th><th>Psychological</th><th>Readiness</th><th>Per-trade limit</th><th>Actions</th></tr></thead><tbody>{reports.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.ruleVersion}</td><td>{item.report.scores.financial}</td><td>{item.report.scores.psychological}</td><td>{item.report.scores.readiness}</td><td>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(item.report.budget.perTrade)}</td><td><button className="text-link" onClick={() => setSelected(item.id)}>View</button>{" · "}<button className="text-link" onClick={() => void remove(item.id)}>Delete</button></td></tr>)}</tbody></table></div>}
    {active && <RiskReportView report={active.report} />}
  </div>;
}
