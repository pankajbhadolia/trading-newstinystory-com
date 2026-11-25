"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import Link from "next/link";
import { categories, ruleSchema } from "@/modules/journal/domain";
import { api, jsonRequest } from "@/components/journal/shared";

const ruleResponse = ruleSchema.extend({ id: z.string(), userId: z.string(), createdAt: z.string(), updatedAt: z.string() });
type Rule = z.infer<typeof ruleResponse>;

export function Rules({ dirty, onDirtyChange }: { dirty: boolean; onDirtyChange: (value: boolean) => void }) {
  const [rules, setRules] = useState<Rule[]>();
  const [id, setId] = useState<string>();
  const [category, setCategory] = useState<string>(categories[0]);
  const [title, setTitle] = useState("");
  const [weight, setWeight] = useState("1");
  const [enabled, setEnabled] = useState(true);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api("/api/journal/rules", z.object({ rules: z.array(ruleResponse) })).then((data) => { if (active) setRules(data.rules); }).catch((cause: unknown) => { if (active) setMessage(cause instanceof Error ? cause.message : "Could not load rules."); });
    return () => { active = false; };
  }, [version]);

  function reset() { setId(undefined); setCategory(categories[0]); setTitle(""); setWeight("1"); setEnabled(true); onDirtyChange(false); }
  async function save() {
    const result = ruleSchema.safeParse({ category, title, weight: Number(weight), active: enabled });
    if (!result.success) { setMessage(result.error.issues[0]?.message ?? "Check your rule."); return; }
    setBusy(true); setMessage("");
    try {
      await api(id ? `/api/journal/rules/${encodeURIComponent(id)}` : "/api/journal/rules", id ? z.object({ id: z.string() }) : ruleResponse, jsonRequest(id ? "PUT" : "POST", id ? result.data : { rule: result.data }));
      reset(); setVersion((value) => value + 1); setMessage("Rule saved.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not save rule."); }
    finally { setBusy(false); }
  }
  async function starter() {
    setBusy(true); setMessage("");
    try { await api("/api/journal/rules", z.object({ count: z.number() }), jsonRequest("POST", { initialize: true })); setVersion((value) => value + 1); setMessage("Starter checklist added."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not add starter checklist."); }
    finally { setBusy(false); }
  }
  async function remove(rule: Rule) {
    if (!window.confirm(`Delete "${rule.title}"? Existing review snapshots will remain.`)) return;
    try { await api(`/api/journal/rules/${encodeURIComponent(rule.id)}`, z.null(), { method: "DELETE" }); if (id === rule.id) reset(); setVersion((value) => value + 1); setMessage("Rule deleted."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not delete rule."); }
  }
  return <div className="journal-section">
    <h2>Rules &amp; checklists</h2><p>Starter checklists are available on Free. Creating or editing custom rules requires Pro. <Link className="text-link" href="/account">View subscription</Link>. Weights range from 1 to 10; changing a rule does not rewrite existing review snapshots.</p>
    {rules?.length === 0 && <Button disabled={busy} onClick={() => void starter()}>Add eight starter checklist items</Button>}
    <section className="ui-card journal-editor"><h3>{id ? "Edit rule" : "New rule"}</h3><div className="journal-fields">
      <label>Category<Select value={category} onChange={(event) => { setCategory(event.target.value); onDirtyChange(true); }}>{categories.map((item) => <option key={item}>{item}</option>)}</Select></label>
      <label>Rule<Input maxLength={200} value={title} onChange={(event) => { setTitle(event.target.value); onDirtyChange(true); }} /></label>
      <label>Weight<Input type="number" min="1" max="10" step="1" value={weight} onChange={(event) => { setWeight(event.target.value); onDirtyChange(true); }} /></label>
      <label className="journal-checkbox"><input type="checkbox" checked={enabled} onChange={(event) => { setEnabled(event.target.checked); onDirtyChange(true); }} /> Active for new reviews</label>
    </div><div className="journal-actions"><Button disabled={busy} onClick={() => void save()}>{id ? "Update rule" : "Add rule"}</Button>{id && <Button variant="secondary" onClick={() => { if (!dirty || window.confirm("Discard unsaved rule changes?")) reset(); }}>Cancel edit</Button>}</div></section>
    <p role="status">{message}</p>
    {rules && categories.map((name) => <section className="journal-rule-group" key={name}><h3>{name}</h3>{rules.filter((rule) => rule.category === name).length === 0 ? <p>No rules yet.</p> : <ul>{rules.filter((rule) => rule.category === name).map((rule) => <li key={rule.id}><span>{rule.title} <small>Weight {rule.weight} · {rule.active ? "Active" : "Inactive"}</small></span><span><button className="text-link" onClick={() => { if (dirty && !window.confirm("Discard unsaved rule changes?")) return; setId(rule.id); setCategory(rule.category); setTitle(rule.title); setWeight(String(rule.weight)); setEnabled(rule.active); onDirtyChange(false); setMessage(""); }}>Edit</button>{" · "}<button className="text-link" onClick={() => void remove(rule)}>Delete</button></span></li>)}</ul>}</section>)}
  </div>;
}
