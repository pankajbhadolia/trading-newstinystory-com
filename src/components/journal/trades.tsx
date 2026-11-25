"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { calculateTrade, instruments, sessions, tradeSchema, type TradeInput } from "@/modules/journal/domain";
import { api, formatMoney, jsonRequest, localDate, Screenshots, useUrlSearch } from "@/components/journal/shared";

const screenshot = z.object({ id: z.string(), name: z.string(), mimeType: z.string() });
const tradeRowSchema = z.object({ id: z.string(), record: tradeSchema, createdAt: z.string(), updatedAt: z.string(), screenshots: z.array(screenshot) });
const summarySchema = z.object({ _sum: z.object({ gross: z.string().nullable(), net: z.string().nullable() }), _count: z.object({ _all: z.number(), net: z.number() }) });
const listSchema = z.object({ trades: z.array(tradeRowSchema), count: z.number(), page: z.number(), summaryDate: z.string(), day: summarySchema, month: summarySchema });
type TradeRow = z.infer<typeof tradeRowSchema>;

type RawTrade = {
  date: string; session: string; instrument: string; symbol: string; segment: string; strikePrice: string; expiryDate: string; direction: string;
  executions: { side: "ENTRY" | "EXIT"; price: string; quantity: string }[];
  stopLoss: string; target: string; charges: string; strategy: string; entryReason: string; exitReason: string; emotion: string; notes: string;
};

function rawTrade(trade?: TradeInput): RawTrade {
  return {
    date: trade?.date ?? "", session: trade?.session ?? "", instrument: trade?.instrument ?? "", symbol: trade?.symbol ?? "", segment: trade?.segment ?? "",
    strikePrice: trade?.strikePrice?.toString() ?? "", expiryDate: trade?.expiryDate ?? "", direction: trade?.direction ?? "",
    executions: trade?.executions.map((item) => ({ side: item.side, price: item.price?.toString() ?? "", quantity: item.quantity?.toString() ?? "" })) ?? [{ side: "ENTRY", price: "", quantity: "" }],
    stopLoss: trade?.stopLoss?.toString() ?? "", target: trade?.target?.toString() ?? "", charges: trade?.charges?.toString() ?? "",
    strategy: trade?.strategy ?? "", entryReason: trade?.entryReason ?? "", exitReason: trade?.exitReason ?? "", emotion: trade?.emotion ?? "", notes: trade?.notes ?? "",
  };
}

function toInput(raw: RawTrade, draft: boolean) {
  const number = (value: string) => value.trim() === "" ? null : Number(value);
  return {
    ...raw, date: raw.date || null, session: raw.session || null, instrument: raw.instrument || null,
    strikePrice: number(raw.strikePrice), expiryDate: raw.expiryDate || null, direction: raw.direction || null,
    stopLoss: number(raw.stopLoss), target: number(raw.target), charges: number(raw.charges), draft,
    executions: raw.executions.map((item) => ({ ...item, price: number(item.price), quantity: number(item.quantity) })),
  };
}

function TradeEditor({ row, onSaved, onCancel, onDirtyChange }: { row?: TradeRow; onSaved: (id: string) => void; onCancel: () => void; onDirtyChange: (value: boolean) => void }) {
  const [values, setValues] = useState<RawTrade>(() => rawTrade(row?.record));
  const [id, setId] = useState(row?.id);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = tradeSchema.safeParse(toInput(values, true));
  const calc = preview.success ? calculateTrade(preview.data) : null;
  function set<K extends keyof RawTrade>(key: K, value: RawTrade[K]) { setValues((old) => ({ ...old, [key]: value })); onDirtyChange(true); setMessage(""); }
  function updateExecution(index: number, patch: Partial<RawTrade["executions"][number]>) { set("executions", values.executions.map((item, i) => i === index ? { ...item, ...patch } : item)); }
  async function save(draft: boolean) {
    const result = tradeSchema.safeParse(toInput(values, draft));
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Check your inputs."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const saved = await api(id ? `/api/journal/trades/${encodeURIComponent(id)}` : "/api/journal/trades", z.object({ id: z.string() }), jsonRequest(id ? "PUT" : "POST", result.data));
      setId(saved.id);
      onDirtyChange(false);
      setMessage(draft ? "Draft saved." : "Trade saved.");
      onSaved(saved.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save trade."); }
    finally { setBusy(false); }
  }
  const numberField = (label: string, key: "strikePrice" | "stopLoss" | "target" | "charges", allowZero = false) => <label>{label}<Input type="number" min={allowZero ? "0" : "0.01"} max="1000000000" step="0.01" value={values[key]} onChange={(event) => set(key, event.target.value)} /></label>;
  return <section className="ui-card journal-editor">
    <h2>{id ? "Edit trade" : "New trade"}</h2><p>Save incomplete entries as drafts. Executions are manual; quantity is in units, including for derivatives.</p>
    <div className="journal-fields">
      <label>Trading date<Input type="date" value={values.date} onChange={(event) => set("date", event.target.value)} /></label>
      <label>Trading session<Select value={values.session} onChange={(event) => set("session", event.target.value)}><option value="">Select</option>{sessions.map((item) => <option key={item}>{item}</option>)}</Select></label>
      <label>Instrument<Select value={values.instrument} onChange={(event) => set("instrument", event.target.value)}><option value="">Select</option>{instruments.map((item) => <option key={item}>{item}</option>)}</Select></label>
      <label>Symbol<Input maxLength={40} value={values.symbol} onChange={(event) => set("symbol", event.target.value)} /></label>
      <label>Segment<Input maxLength={80} value={values.segment} onChange={(event) => set("segment", event.target.value)} /></label>
      <label>Direction<Select value={values.direction} onChange={(event) => set("direction", event.target.value)}><option value="">Select</option><option value="BUY">Buy / long</option><option value="SELL">Sell / short</option></Select></label>
      {numberField("Strike price (₹)", "strikePrice")}
      <label>Expiry date<Input type="date" value={values.expiryDate} onChange={(event) => set("expiryDate", event.target.value)} /></label>
      {numberField("Stop-loss (₹)", "stopLoss")}{numberField("Target (₹)", "target")}{numberField("Total brokerage and charges (₹)", "charges", true)}
      <label>Trading strategy<Input maxLength={200} value={values.strategy} onChange={(event) => set("strategy", event.target.value)} /></label>
      <label>Emotional condition<Input maxLength={200} value={values.emotion} onChange={(event) => set("emotion", event.target.value)} /></label>
    </div>
    <div className="journal-executions"><h3>Entry and exit executions</h3><p>Each row records a price and quantity. Entry and exit averages are weighted by units.</p>
      {values.executions.map((item, index) => <div className="execution-row" key={index}>
        <label>Execution {index + 1} type<Select value={item.side} onChange={(event) => updateExecution(index, { side: event.target.value === "EXIT" ? "EXIT" : "ENTRY" })}><option value="ENTRY">Entry</option><option value="EXIT">Exit</option></Select></label>
        <label>Price (₹)<Input type="number" step="0.01" min="0.01" max="1000000000" value={item.price} onChange={(event) => updateExecution(index, { price: event.target.value })} /></label>
        <label>Quantity in units<Input type="number" step="1" min="1" max="1000000" value={item.quantity} onChange={(event) => updateExecution(index, { quantity: event.target.value })} /></label>
        <Button variant="secondary" aria-label={`Remove execution ${index + 1}`} onClick={() => set("executions", values.executions.filter((_, i) => i !== index))}>Remove</Button>
      </div>)}
      <Button variant="secondary" disabled={values.executions.length >= 100} onClick={() => set("executions", [...values.executions, { side: "ENTRY", price: "", quantity: "" }])}>Add execution</Button>
    </div>
    <div className="journal-fields journal-notes">
      {([["entryReason", "Entry reason"], ["exitReason", "Exit reason"], ["notes", "Personal notes"]] as const).map(([key, label]) => <label key={key}>{label}<textarea className="ui-input" maxLength={key === "notes" ? 10000 : 4000} value={values[key]} onChange={(event) => set(key, event.target.value)} rows={3} /></label>)}
    </div>
    <div className="journal-calculation"><h3>Calculation preview</h3>{calc ? <dl>
      <div><dt>Average entry</dt><dd>₹{calc.averageEntry}</dd></div><div><dt>Average exit</dt><dd>{calc.averageExit ? `₹${calc.averageExit}` : "—"}</dd></div>
      <div><dt>Entry / exit / open units</dt><dd>{calc.entryQuantity} / {calc.exitQuantity} / {calc.openQuantity}</dd></div>
      <div><dt>Realized gross P&amp;L</dt><dd>{formatMoney(calc.gross)}</dd></div><div><dt>Realized net P&amp;L</dt><dd>{formatMoney(calc.net)}</dd></div>
    </dl> : <p>Complete valid entry and exit executions to calculate P&amp;L.</p>}<p>Matched exit units only. All entered charges are deducted immediately, including on partial closes; net is unavailable until charges are entered. Later entries can change the aggregate weighted average. Open-position unrealized P&amp;L is not included.</p></div>
    {error && <p className="calculator-error" role="alert">{error}</p>}<p role="status">{message}</p>
    <div className="journal-actions"><Button disabled={busy} onClick={() => void save(true)}>Save draft</Button><Button disabled={busy} variant="secondary" onClick={() => void save(false)}>Save active trade</Button><Button variant="secondary" onClick={onCancel}>Close editor</Button></div>
    {id ? <Screenshots key={id} kind="trade" id={id} /> : <p>Save the trade before adding screenshots.</p>}
  </section>;
}

export function Trades({ dirty, onDirtyChange }: { dirty: boolean; onDirtyChange: (value: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [session, setSession] = useState("");
  const [summaryDate, setSummaryDate] = useState(localDate);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<z.infer<typeof listSchema>>();
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<{ row?: TradeRow; key: string }>();
  const [editorId, setEditorId] = useState<string>();
  const search = useUrlSearch();
  const [referenceCleared, setReferenceCleared] = useState(false);
  const requestedId = new URLSearchParams(search).get("trade") ?? "";
  const referenceId = !referenceCleared && requestedId.length <= 128 ? requestedId : "";

  function changeEditor(next?: { row?: TradeRow; key: string }) {
    if (dirty && !window.confirm("Discard unsaved trade changes?")) return;
    onDirtyChange(false);
    setEditorId(next?.row?.id);
    setEdit(next);
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ q: query, date, session, page: String(page), summaryDate, id: referenceId });
    api(`/api/journal/trades?${params}`, listSchema).then((result) => { if (active) { setData(result); setError(""); } }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load trades."); });
    return () => { active = false; };
  }, [query, date, session, page, summaryDate, version, referenceId]);

  async function remove(row: TradeRow) {
    if (!window.confirm("Delete this trade and its screenshots permanently?")) return;
    try { await api(`/api/journal/trades/${encodeURIComponent(row.id)}`, z.null(), { method: "DELETE" }); setVersion((value) => value + 1); if (editorId === row.id) { setEdit(undefined); setEditorId(undefined); onDirtyChange(false); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete trade."); }
  }
  return <div className="journal-section">
    <div className="journal-heading"><div><h2>Trading journal</h2><p>Manual records only. Drafts are excluded from summaries.</p></div><div className="journal-actions"><Button onClick={() => changeEditor({ key: `new-${Date.now()}` })}>New trade</Button><Link className="ui-button ui-button-secondary" href="/api/journal/export" download>Export all CSV</Link></div></div>
    {edit && <TradeEditor key={edit.key} row={edit.row} onSaved={(id) => { setEditorId(id); setVersion((value) => value + 1); }} onCancel={() => changeEditor()} onDirtyChange={onDirtyChange} />}
    {referenceId && <p>Showing referenced trade. <button className="text-link" onClick={() => { setReferenceCleared(true); window.history.replaceState(null, "", window.location.pathname); }}>Show all trades</button></p>}
    <div className="journal-filters"><label>Search symbol or instrument<Input type="search" maxLength={100} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label><label>Filter date<Input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} /></label><label>Filter session<Select value={session} onChange={(event) => { setSession(event.target.value); setPage(1); }}><option value="">All sessions</option>{sessions.map((item) => <option key={item}>{item}</option>)}</Select></label><label>Summary date<Input type="date" value={summaryDate} onChange={(event) => setSummaryDate(event.target.value || localDate())} /></label></div>
    {error && <p className="calculator-error" role="alert">{error}</p>}
    {data && <><div className="journal-summary">{([["Daily", data.day], ["Monthly", data.month]] as const).map(([label, total]) => <section className="ui-card" key={label}><h3>{label} realized P&amp;L</h3><p>Gross: <strong>{formatMoney(total._sum.gross)}</strong> · Net (known charges): <strong>{formatMoney(total._sum.net)}</strong></p><small>{total._count._all} active trades with exits; {total._count.net} include charges. Grouped by trading date, not execution date.</small></section>)}</div>
      <p>{data.count} {data.count === 1 ? "trade" : "trades"}</p><div className="risk-table-wrap"><table className="risk-table"><thead><tr><th>Date</th><th>Session</th><th>Symbol</th><th>Instrument</th><th>Status</th><th>Gross</th><th>Net</th><th>Actions</th></tr></thead><tbody>{data.trades.map((row) => {
        const calc = calculateTrade(row.record);
        const status = row.record.draft ? "Draft" : calc?.openQuantity ? "Open" : "Closed";
        return <tr key={row.id}><td>{row.record.date || "—"}</td><td>{row.record.session || "—"}</td><td>{row.record.symbol || "—"}</td><td>{row.record.instrument || "—"}</td><td>{status}</td><td>{formatMoney(calc?.gross)}</td><td>{formatMoney(calc?.net)}</td><td><button className="text-link" onClick={() => changeEditor({ row, key: `${row.id}-${Date.now()}` })}>Edit</button>{" · "}<button className="text-link" onClick={() => void remove(row)}>Delete</button></td></tr>;
      })}</tbody></table></div><div className="journal-actions"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page}</span><Button variant="secondary" disabled={page * 50 >= data.count} onClick={() => setPage(page + 1)}>Next</Button></div></>}
  </div>;
}
