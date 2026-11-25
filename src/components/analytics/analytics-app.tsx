"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { z } from "zod";
import { AccountForm, authClient } from "@/components/account-form";
import { api, formatMoney, localDate } from "@/components/journal/shared";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { analyticsDataSchema, makeReport, moneyDifference, type Granularity, type Reference } from "@/modules/analytics/report";
import { instruments, sessions } from "@/modules/journal/domain";
import { featurePolicy } from "@/modules/subscriptions/entitlements";

function shift(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
const granularityOptions: Granularity[] = ["daily", "weekly", "monthly", "quarterly", "yearly"];
type Period = ReturnType<typeof makeReport>;
const basicSchema = z.object({
  range: z.object({ start: z.string(), end: z.string() }), count: z.number(), wins: z.number(), losses: z.number(), breakEven: z.number(),
  winRate: z.string().nullable(), gross: z.string().nullable(), net: z.string().nullable(), netCount: z.number(),
  periods: z.array(z.object({ label: z.string(), count: z.number(), gross: z.string(), references: z.array(z.object({ id: z.string(), date: z.string(), session: z.string(), symbol: z.string() })) })),
  references: z.array(z.object({ id: z.string(), date: z.string(), session: z.string(), symbol: z.string() })),
});

function Evidence({ references }: { references: Reference[] }) {
  if (!references.length) return <span>No matching realized trades recorded.</span>;
  return <details><summary>{references.length} supporting trade{references.length === 1 ? "" : "s"}</summary><ul className="analytics-evidence">
    {references.map((ref) => <li key={ref.id}><Link className="text-link" href={`/journal?trade=${encodeURIComponent(ref.id)}`}>{ref.date} · {ref.session} · {ref.symbol} · {ref.id}</Link></li>)}
  </ul></details>;
}

function ReviewEvidence({ references }: { references: Period["reviewReferences"] }) {
  if (!references.length) return <span>No scored reviews recorded.</span>;
  return <details><summary>{references.length} supporting review{references.length === 1 ? "" : "s"}</summary><ul className="analytics-evidence">
    {references.map((ref) => <li key={ref.id}><Link className="text-link" href={`/journal/daily-logbook?date=${ref.date}&session=${encodeURIComponent(ref.session)}`}>{ref.date} · {ref.session} · {ref.id}</Link></li>)}
  </ul></details>;
}

function Metrics({ report }: { report: Period }) {
  const values: [string, string][] = [
    ["Realized trades", String(report.count)], ["Winning / losing / flat", `${report.wins} / ${report.losses} / ${report.breakEven}`],
    ["Win rate", report.winRate === null ? "—" : `${report.winRate}%`],
    ["Gross P&L", formatMoney(report.gross)], ["Net P&L (known charges)", formatMoney(report.net)],
    ["Average winning trade", formatMoney(report.averageWin)], ["Average losing trade", formatMoney(report.averageLoss)],
    ["Profit factor", report.profitFactor ?? "—"], ["Expectancy per trade", formatMoney(report.expectancy)],
    ["Maximum drawdown", formatMoney(report.maxDrawdown)],
    ["Average planned reward/risk", report.riskReward === null ? "—" : `${report.riskReward}:1`],
    ["Average entry size (units)", report.averageUnits ?? "—"],
  ];
  return <><div className="analytics-metrics">{values.map(([label, value]) => <div className="ui-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <p>Net includes {report.netCount} of {report.count} trades; missing charges are not treated as zero. Planned reward/risk is available for {report.riskRewardCount} trades. Profit factor is unavailable without a losing trade.</p>
    <Evidence references={report.references} />
  </>;
}

function GroupTable({ title, groups }: { title: string; groups: Period["strategies"] }) {
  return <section className="ui-card analytics-section"><h3>{title}</h3>{groups.length ? <div className="risk-table-wrap"><table className="risk-table"><thead><tr><th>Group</th><th>Trades</th><th>Gross P&amp;L</th><th>Evidence</th></tr></thead><tbody>
    {groups.map((group) => <tr key={group.label}><td>{group.label}</td><td>{group.count}</td><td>{formatMoney(group.gross)}</td><td><Evidence references={group.references} /></td></tr>)}
  </tbody></table></div> : <p>No realized trades in this range.</p>}</section>;
}

function PeriodChart({ report }: { report: Period }) {
  const [selected, setSelected] = useState("");
  const max = Math.max(1, ...report.periods.map((period) => Math.abs(Number(period.gross))));
  const current = report.periods.find((period) => period.label === selected);
  return <section className="ui-card analytics-section"><h3>Performance by period</h3><p>Select a bar to inspect its trades. Only periods with recorded realized trades are shown.</p>
    {report.periods.length ? <div className="analytics-chart" aria-label="Gross P&L by selected period">
      {report.periods.map((period) => <button key={period.label} type="button" className="analytics-bar" aria-pressed={selected === period.label} onClick={() => setSelected(period.label)}>
        <span className={Number(period.gross) < 0 ? "analytics-bar-fill negative" : "analytics-bar-fill"} style={{ height: `${Math.max(4, Math.abs(Number(period.gross)) / max * 120)}px` }} />
        <strong>{formatMoney(period.gross)}</strong><span>{period.label}</span>
      </button>)}
    </div> : <p>No realized trades in this range.</p>}
    {current && <div className="analytics-selection"><strong>{current.label}: {Number(current.gross) > 0 ? "profitable" : Number(current.gross) < 0 ? "losing" : "flat"} period</strong><Evidence references={current.references} /></div>}
    {report.periods.length > 0 && <div className="risk-table-wrap"><table className="risk-table"><thead><tr><th>Period</th><th>Outcome</th><th>Gross P&amp;L</th><th>Evidence</th></tr></thead><tbody>
      {report.periods.map((period) => <tr key={period.label}><td>{period.label}</td><td>{Number(period.gross) > 0 ? "Profitable" : Number(period.gross) < 0 ? "Losing" : "Flat"}</td><td>{formatMoney(period.gross)}</td><td><Evidence references={period.references} /></td></tr>)}
    </tbody></table></div>}
  </section>;
}

function Violations({ report }: { report: Period }) {
  return <section className="ui-card analytics-section"><h3>Checklist observations</h3>
    {report.reviewsExcluded ? <p>Review scores and violations are unavailable with strategy or instrument filters: reviews apply to a whole session, not individual trades.</p> : <>
      <p>Average discipline score: {report.discipline === null ? "—" : `${report.discipline}%`} across {report.reviewCount} scored session reviews. Stop-loss violations: {report.stopLossViolations.length} self-reported checklist items in {report.reviewReferences.length} scored reviews.</p>
      <ReviewEvidence references={report.reviewReferences} />
      {report.stopLossViolations.map((item) => <div key={`${item.reviewId}-${item.ruleId}`}><Link className="text-link" href={`/journal/daily-logbook?date=${item.date}&session=${encodeURIComponent(item.session)}`}>{item.date} · {item.session} · {item.title} (review)</Link><Evidence references={item.references} /></div>)}
      <h4>Repeated recorded violations</h4>
      {report.repeatedViolations.length ? report.repeatedViolations.map((items) => <div key={items[0].ruleId}><strong>{items[0].title}: {items.length} reviews</strong>
        <ul className="analytics-evidence">{items.map((item) => <li key={item.reviewId}><Link className="text-link" href={`/journal/daily-logbook?date=${item.date}&session=${encodeURIComponent(item.session)}`}>{item.date} · {item.session} review</Link><Evidence references={item.references} /></li>)}</ul>
      </div>) : <p>No rule was recorded as violated in two or more reviews.</p>}
    </>}
    <p>Violations are self-reported; an exit price alone cannot establish that a stop-loss rule was broken.</p>
  </section>;
}

function Comparison({ a, b }: { a: Period; b: Period }) {
  const rows: [string, string, string][] = [
    ["Period", `${a.range.start} to ${a.range.end}`, `${b.range.start} to ${b.range.end}`],
    ["Gross outcome", formatMoney(a.gross), formatMoney(b.gross)],
    ["Realized trades", String(a.count), String(b.count)],
    ["Trades per calendar day", a.frequency ?? "—", b.frequency ?? "—"],
    ["Average entry units", a.averageUnits ?? "—", b.averageUnits ?? "—"],
    ["Average discipline score", a.discipline === null ? "—" : `${a.discipline}%`, b.discipline === null ? "—" : `${b.discipline}%`],
    ["Stop-loss violations", a.reviewsExcluded ? "—" : String(a.stopLossViolations.length), b.reviewsExcluded ? "—" : String(b.stopLossViolations.length)],
  ];
  const classify = (gross: string | null) => gross === null ? "no realized data" : Number(gross) > 0 ? "profitable" : Number(gross) < 0 ? "losing" : "flat";
  const compare = (label: string, av: string | null, bv: string | null) => {
    if (av === null || bv === null) return `${label}: insufficient recorded data for a comparison.`;
    const difference = Number(av) - Number(bv);
    return `${label} in A is ${difference > 0 ? "higher than" : difference < 0 ? "lower than" : "the same as"} B.`;
  };
  const strategyNames = [...new Set([...a.strategies.map((group) => group.label), ...b.strategies.map((group) => group.label)])].sort();
  return <section className="ui-card analytics-section"><h2>Trading journey comparison</h2><p>Period A is {classify(a.gross)}; period B is {classify(b.gross)}. Choose any losing and profitable ranges to compare them side by side.</p>
    <div className="risk-table-wrap"><table className="risk-table"><thead><tr><th>Measure</th><th>Period A</th><th>Period B</th></tr></thead><tbody>{rows.map(([label, av, bv]) => <tr key={label}><th>{label}</th><td>{av}</td><td>{bv}</td></tr>)}</tbody></table></div>
    <p>Differences describe the recorded periods only. An association does not establish that one factor caused a result. Sizes are entry units, which may not be comparable across instruments.</p>
    <ul><li>{compare("Recorded trading frequency", a.frequency, b.frequency)}</li><li>{compare("Average entry size", a.averageUnits, b.averageUnits)}</li><li>{compare("Average discipline score", a.discipline, b.discipline)}</li></ul>
    <div className="analytics-compare-evidence"><div><strong>Period A evidence</strong><Evidence references={a.references} /><ReviewEvidence references={a.reviewReferences} /></div><div><strong>Period B evidence</strong><Evidence references={b.references} /><ReviewEvidence references={b.reviewReferences} /></div></div>
    <h3>Strategy performance by period</h3>{strategyNames.length ? <div className="risk-table-wrap"><table className="risk-table"><thead><tr><th>Strategy</th><th>Period A gross</th><th>Period B gross</th><th>Change (A − B)</th><th>Evidence</th></tr></thead><tbody>{strategyNames.map((name) => {
      const ag = a.strategies.find((group) => group.label === name), bg = b.strategies.find((group) => group.label === name);
      return <tr key={name}><td>{name}</td><td>{formatMoney(ag?.gross)}</td><td>{formatMoney(bg?.gross)}</td><td>{ag && bg ? formatMoney(moneyDifference(ag.gross, bg.gross)) : "—"}</td><td><Evidence references={[...(ag?.references ?? []), ...(bg?.references ?? [])].filter((ref, index, list) => list.findIndex((other) => other.id === ref.id) === index)} /></td></tr>;
    })}</tbody></table></div> : <p>No strategy data recorded.</p>}
    <h3>Recovery observations</h3><p>Recovery means cumulative daily gross P&amp;L has returned to its prior peak within the selected range. Earlier history is not included.</p>
    {([["A", a], ["B", b]] as const).map(([label, report]) => <div key={label}><strong>Period {label}: {report.recovery.length ? report.recovery.map((item) => item.date).join(", ") : "No completed recovery recorded"}</strong><Evidence references={report.references} /></div>)}
  </section>;
}

const subscribeToToday = () => () => {};

export function AnalyticsApp({ journey = false }: { journey?: boolean }) {
  const today = useSyncExternalStore(subscribeToToday, localDate, () => "");
  return today ? <AnalyticsReport today={today} journey={journey} /> : <p role="status">Loading report options…</p>;
}

function AnalyticsReport({ today, journey }: { today: string; journey: boolean }) {
  const [aStart, setAStart] = useState(() => shift(today, -29));
  const [aEnd, setAEnd] = useState(today);
  const [bStart, setBStart] = useState(() => shift(today, -59));
  const [bEnd, setBEnd] = useState(() => shift(today, -30));
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [instrument, setInstrument] = useState("");
  const [strategy, setStrategy] = useState("");
  const [session, setSession] = useState("");
  const [data, setData] = useState<z.infer<typeof analyticsDataSchema>>();
  const [basic, setBasic] = useState<z.infer<typeof basicSchema>>();
  const [ranges, setRanges] = useState<{ a: { start: string; end: string }; b: { start: string; end: string } }>();
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const strategies = useMemo(() => [...new Set((data?.trades ?? []).map(({ record }) => record.strategy.trim() || "Not recorded"))].sort(), [data]);
  const filters = { instrument, strategy, session };
  const a = data && ranges ? makeReport(data, ranges.a, granularity, filters) : null;
  const b = data && ranges ? makeReport(data, ranges.b, granularity, filters) : null;

  async function load() {
    setBusy(true); setError(""); setSignedOut(false); setData(undefined); setBasic(undefined); setRanges(undefined);
    try {
      const account = await api("/api/account", z.object({ features: z.array(z.object({ id: z.string(), enabled: z.boolean() })) }));
      if (!account.features.some((feature) => feature.id === (journey ? "journey" : "advancedReports") && feature.enabled)) {
        if (journey) throw new Error("Trading Journey Analyzer requires Pro. Request an upgrade in Account settings.");
        const params = new URLSearchParams({ start: aStart, end: aEnd, interval: "daily" });
        setBasic(await api(`/api/analytics/basic?${params}`, basicSchema));
        return;
      }
      const params = new URLSearchParams({ aStart, aEnd, bStart, bEnd });
      const result = await api(`/api/analytics?${params}`, analyticsDataSchema);
      setInstrument(""); setStrategy(""); setSession("");
      setData(result); setRanges({ a: { start: aStart, end: aEnd }, b: { start: bStart, end: bEnd } });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not load analytics.";
      if (message === "Sign in to access your journal.") setSignedOut(true); else setError(message);
    } finally { setBusy(false); }
  }
  async function signOut() {
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Could not sign out.");
      setData(undefined); setBasic(undefined); setRanges(undefined); setSignedOut(true);
    } catch { setError("Could not sign out. Please try again."); }
  }
  function download() {
    if (basic) {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ methodology: "Gross realized P&L on recorded trade dates; net includes known charges only.", report: basic }, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "trading-analytics.json"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    if (!a || !b) return;
    const methodology = {
      population: "Non-draft trades with an exit, including partial closes; grouped by recorded trading date.",
      outcomes: "Win, loss, expectancy and profit factor use realized gross P&L. Net is a subtotal of trades with known charges.",
      drawdown: "Largest peak-to-trough drop in cumulative daily gross P&L within each selected range, starting at zero; not account-equity drawdown.",
      riskReward: "Mean planned reward divided by planned risk for trades with valid entry, stop and target.",
      reviews: "Review scores and violations refer to the whole session and are excluded by instrument or strategy filters.",
      limitation: "Session labels are not execution times. Correlation does not establish causation; this is not financial advice.",
    };
    const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), methodology, granularity, filters, periodA: a, periodB: b }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "trading-analytics.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function print() {
    const closed = [...document.querySelectorAll<HTMLDetailsElement>(".analytics-app details:not([open])")];
    closed.forEach((element) => { element.open = true; });
    window.addEventListener("afterprint", () => closed.forEach((element) => { element.open = false; }), { once: true });
    window.print();
  }

  return <div className="analytics-app">
    <section className="ui-card analytics-section analytics-controls"><h2>Select report periods</h2><p>Choose two ordered date ranges, each up to five years. Dates use the journal trading date, not execution time.</p>
      <div className="journal-filters">
        <label>Period A start<Input type="date" value={aStart} onChange={(event) => setAStart(event.target.value)} /></label>
        <label>Period A end<Input type="date" value={aEnd} onChange={(event) => setAEnd(event.target.value)} /></label>
        <label>Period B start<Input type="date" value={bStart} onChange={(event) => setBStart(event.target.value)} /></label>
        <label>Period B end<Input type="date" value={bEnd} onChange={(event) => setBEnd(event.target.value)} /></label>
      </div><div className="journal-actions"><Button disabled={busy} onClick={() => void load()}>{busy ? "Loading…" : "Load report"}</Button>{(data || basic) && <Button variant="secondary" onClick={() => void signOut()}>Sign out</Button>}</div>
      {error && <p className="calculator-error" role="alert">{error}</p>}
      {signedOut && <><p>Sign in to access your private journal analytics.</p><AccountForm onSuccess={() => void load()} /></>}
    </section>
    {basic && <section className="ui-card analytics-section"><h2>Basic performance report</h2><p>{basic.range.start} to {basic.range.end}. Free includes the most recent {featurePolicy.journalHistory.limit.FREE} calendar days; comparison and advanced analytics require Pro. <Link className="text-link" href="/account">View subscription and request an upgrade</Link>.</p>
      <div className="analytics-metrics">{([["Realized trades", String(basic.count)], ["Winning / losing / flat", `${basic.wins} / ${basic.losses} / ${basic.breakEven}`], ["Win rate", basic.winRate === null ? "—" : `${basic.winRate}%`], ["Gross P&L", formatMoney(basic.gross)], ["Net P&L (known charges)", formatMoney(basic.net)]] as const).map(([label, value]) => <div className="ui-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <p>Net includes {basic.netCount} of {basic.count} trades; missing charges are not treated as zero. Outcomes use realized gross P&amp;L, including partial closes.</p><Evidence references={basic.references} />
      <GroupTable title="Daily realized performance" groups={basic.periods} />
      <div className="journal-actions analytics-controls"><Button variant="secondary" onClick={download}>Download JSON report</Button><Button variant="secondary" onClick={print}>Print report</Button></div>
    </section>}
    {a && b && data && <>
      <section className="ui-card analytics-section analytics-controls"><h2>Filters and report options</h2><div className="journal-filters">
        <label>Report interval<Select value={granularity} onChange={(event) => { const result = z.enum(granularityOptions).safeParse(event.target.value); if (result.success) setGranularity(result.data); }}>{granularityOptions.map((option) => <option key={option} value={option}>{option}</option>)}</Select></label>
        <label>Instrument<Select value={instrument} onChange={(event) => setInstrument(event.target.value)}><option value="">All instruments</option>{instruments.map((item) => <option key={item}>{item}</option>)}</Select></label>
        <label>Strategy<Select value={strategy} onChange={(event) => setStrategy(event.target.value)}><option value="">All strategies</option>{strategies.map((item) => <option key={item}>{item}</option>)}</Select></label>
        <label>Trading session<Select value={session} onChange={(event) => setSession(event.target.value)}><option value="">All sessions</option>{sessions.map((item) => <option key={item}>{item}</option>)}</Select></label>
      </div><div className="journal-actions"><Button variant="secondary" onClick={download}>Download JSON report</Button><Button variant="secondary" onClick={print}>Print report</Button></div></section>
      <p>Applied filters: {instrument || "all instruments"} · {strategy || "all strategies"} · {session || "all sessions"} · {granularity} intervals.</p>
      <section className="analytics-section"><h2>Period A performance</h2><p>{ranges?.a.start} to {ranges?.a.end}</p><Metrics report={a} /></section>
      <PeriodChart report={a} />
      <div className="analytics-groups"><GroupTable title="By strategy" groups={a.strategies} /><GroupTable title="By instrument" groups={a.instruments} /><GroupTable title="By trading session" groups={a.sessions} /></div>
      <p>Time-of-day analysis uses the recorded session labels only; exact execution times are not recorded.</p>
      <Violations report={a} /><Comparison a={a} b={b} /><Violations report={b} />
      <section className="ui-card analytics-section"><h2>Calculation notes</h2><p>Non-draft trades with at least one exit are included, including partial closes. Outcomes, win rate, averages, profit factor and expectancy use realized gross P&amp;L; flat trades remain in the win-rate denominator. Net is a subtotal of trades with known charges. Full recorded charges are deducted immediately. Trades are grouped by their recorded trading date.</p><p>Maximum drawdown is the largest peak-to-trough drop in cumulative daily gross P&amp;L, beginning at zero at the start of the selected range. It is not account-equity drawdown and has no percentage. Planned reward/risk requires a valid entry, stop and target. This analysis is educational and does not establish causation or predict future performance.</p></section>
    </>}
  </div>;
}
