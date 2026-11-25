"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { categories, checklistItemSchema, disciplineScore, sessions, tradeSchema, type ChecklistItem } from "@/modules/journal/domain";
import { api, formatMoney, jsonRequest, localDate, Screenshots, useUrlSearch } from "@/components/journal/shared";

const reviewSchema = z.object({
  review: z.object({ id: z.string(), date: z.string(), session: z.string(), notes: z.string() }).nullable(),
  checklist: z.array(checklistItemSchema),
  availableRules: z.array(checklistItemSchema),
  trades: z.array(z.object({ id: z.string(), record: tradeSchema, gross: z.string().nullable(), net: z.string().nullable() })),
  history: z.array(z.object({ id: z.string(), date: z.string(), session: z.string() })),
});

export function Reviews({ onDirtyChange }: { onDirtyChange: (value: boolean) => void }) {
  const params = new URLSearchParams(useUrlSearch());
  const date = z.iso.date().safeParse(params.get("date"));
  const session = z.enum(sessions).safeParse(params.get("session"));
  const initialDate = date.success && session.success ? date.data : "";
  const initialSession = date.success && session.success ? session.data : "Full day";
  return <ReviewEditor key={`${initialDate}:${initialSession}`} initialDate={initialDate} initialSession={initialSession} onDirtyChange={onDirtyChange} />;
}

function ReviewEditor({ initialDate, initialSession, onDirtyChange }: { initialDate: string; initialSession: string; onDirtyChange: (value: boolean) => void }) {
  const [date, setDate] = useState(() => initialDate || localDate());
  const [session, setSession] = useState<string>(initialSession);
  const [data, setData] = useState<z.infer<typeof reviewSchema>>();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ date, session });
    api(`/api/journal/reviews?${params}`, reviewSchema).then((result) => {
      if (!active) return;
      setData(result); setItems(result.checklist); setNotes(result.review?.notes ?? ""); setDirty(false);
    }).catch((cause: unknown) => { if (active) setMessage(cause instanceof Error ? cause.message : "Could not load review."); });
    return () => { active = false; };
  }, [date, session, version]);

  function choose(nextDate: string, nextSession: string) {
    if (nextDate === date && nextSession === session) return;
    if (dirty && !window.confirm("Discard unsaved review changes?")) return;
    setData(undefined); setDate(nextDate); setSession(nextSession); setDirty(false); onDirtyChange(false); setMessage("");
  }
  function update(ruleId: string, patch: Partial<ChecklistItem>) {
    setItems((old) => old.map((item) => item.ruleId === ruleId ? { ...item, ...patch } : item));
    setDirty(true);
    onDirtyChange(true);
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      await api("/api/journal/reviews", z.object({ id: z.string() }), jsonRequest("POST", {
        date, session, notes, responses: items.map(({ ruleId, status, note }) => ({ ruleId, status, note })),
      }));
      setDirty(false); onDirtyChange(false); setVersion((value) => value + 1); setMessage("Review saved.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not save review."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!data?.review || !window.confirm("Delete this review and its screenshots permanently?")) return;
    try { await api(`/api/journal/reviews/${encodeURIComponent(data.review.id)}`, z.null(), { method: "DELETE" }); setDirty(false); onDirtyChange(false); setVersion((value) => value + 1); setMessage("Review deleted."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not delete review."); }
  }
  const score = disciplineScore(items);
  return <div className="journal-section"><h2>Daily session review</h2><p>Review trades for the same date and session, record notes, checklist completion, violations and screenshots.</p>
    <div className="journal-filters"><label>Review date<Input type="date" value={date} onChange={(event) => { if (event.target.value) choose(event.target.value, session); }} /></label><label>Trading session<Select value={session} onChange={(event) => choose(date, event.target.value)}>{sessions.map((item) => <option key={item}>{item}</option>)}</Select></label></div>
    {message && <p role="status">{message}</p>}
    {data && <>
      <div className="ui-card journal-editor"><h3>Linked trades</h3><p>Trades match the review&apos;s trading date and session; draft trades are labelled.</p>
        {data.trades.length ? <div className="risk-table-wrap"><table className="risk-table"><thead><tr><th>Symbol</th><th>Instrument</th><th>Status</th><th>Gross</th><th>Net</th></tr></thead><tbody>{data.trades.map((trade) => <tr key={trade.id}><td>{trade.record.symbol || "—"}</td><td>{trade.record.instrument || "—"}</td><td>{trade.record.draft ? "Draft" : "Active"}</td><td>{formatMoney(trade.gross)}</td><td>{formatMoney(trade.net)}</td></tr>)}</tbody></table></div> : <p>No trades for this session.</p>}
      </div>
      <div className="ui-card journal-editor"><h3>Discipline checklist</h3><p>Score: <strong>{score === null ? "Not available" : `${score}%`}</strong>. Completed weight ÷ applicable weight; pending and violations count against the score, while not-applicable items are excluded. This is a self-reported reflection, not a trading outcome.</p>
        {!items.length && <p>No active rules. Add rules or the starter checklist in Rules &amp; checklists first.</p>}
        {data.availableRules.some((rule) => !items.some((item) => item.ruleId === rule.ruleId)) && <Button variant="secondary" onClick={() => { setItems((old) => [...old, ...data.availableRules.filter((rule) => !old.some((item) => item.ruleId === rule.ruleId))]); setDirty(true); onDirtyChange(true); }}>Add current rules to this review</Button>}
        {categories.map((category) => items.some((item) => item.category === category) && <section className="review-category" key={category}><h4>{category}</h4>{items.filter((item) => item.category === category).map((item) => <div className="review-item" key={item.ruleId}><div><strong>{item.title}</strong><small>Weight {item.weight}</small></div><label>Status<Select value={item.status} onChange={(event) => { const parsed = checklistItemSchema.shape.status.safeParse(event.target.value); if (parsed.success) update(item.ruleId, { status: parsed.data }); }}><option value="PENDING">Pending</option><option value="DONE">Completed</option><option value="VIOLATED">Violated</option><option value="NA">Not applicable</option></Select></label><label>Note or violation details<Input maxLength={1000} value={item.note} onChange={(event) => update(item.ruleId, { note: event.target.value })} /></label></div>)}</section>)}
      </div>
      <section className="ui-card journal-editor"><h3>Session notes</h3><label>Review notes<textarea className="ui-input" rows={5} maxLength={10000} value={notes} onChange={(event) => { setNotes(event.target.value); setDirty(true); onDirtyChange(true); }} /></label><div className="journal-actions"><Button disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save review"}</Button>{data.review && <Button variant="secondary" onClick={() => void remove()}>Delete review</Button>}</div>
        {data.review ? <Screenshots key={data.review.id} kind="review" id={data.review.id} /> : <p>Save the review before adding screenshots.</p>}
      </section>
      <section className="journal-rule-group"><h3>Review history</h3><p>Showing up to 100 recent reviews.</p>{data.history.length ? <ul>{data.history.map((item) => <li key={item.id}><button className="text-link" onClick={() => choose(item.date, item.session)}>{item.date} · {item.session}</button></li>)}</ul> : <p>No saved reviews yet.</p>}</section>
    </>}
  </div>;
}
