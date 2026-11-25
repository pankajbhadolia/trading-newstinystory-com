"use client";

import { useId, useState } from "react";
import { Decimal } from "decimal.js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { simulateDrawdown } from "@/modules/market-tools/drawdown";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const decimal = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function money(value: Decimal) {
  return value.gt(0) && value.lt("0.005") ? "< ₹0.01" : currency.format(value.toNumber());
}

function percent(value: Decimal) {
  return `${value.gt("1000000000000") ? value.toExponential(3) : decimal.format(value.toNumber())}%`;
}

export function DrawdownSimulator() {
  const [capital, setCapital] = useState("");
  const [returns, setReturns] = useState("");
  const [message, setMessage] = useState("");
  const id = useId();
  let result: ReturnType<typeof simulateDrawdown> | undefined;
  let error = "";
  if (capital.trim() && returns.trim()) {
    try { result = simulateDrawdown(capital, returns); }
    catch (caught) { if (!(caught instanceof Error)) throw caught; error = caught.message; }
  }

  async function copy() {
    if (!result) return;
    const text = [
      "Drawdown Simulator — hypothetical illustration",
      `Starting capital: ${money(result.capital)}`,
      `Returns: ${returns}%`,
      `Ending balance: ${money(result.balance)}`,
      `Maximum drawdown: ${percent(result.maximumDrawdown)}`,
      `Current drawdown: ${percent(result.finalDrawdown)}`,
      `Recovery to peak: ${result.recovery === null ? "Not possible from zero capital" : percent(result.recovery)}`,
      ...result.steps.map((step, index) => `Step ${index + 1}: return ${step.change.toString()}%, balance ${money(step.balance)}, peak ${money(step.peak)}, drawdown ${percent(step.drawdown)}`),
      "Excludes fees, deposits and withdrawals; not financial advice.",
    ].join("\n");
    try { await navigator.clipboard.writeText(text); setMessage("Results copied to clipboard."); }
    catch { setMessage("Could not copy results. Check clipboard permissions or use Print."); }
  }

  return <>
    <div className="calculator-layout">
      <section className="calculator-form ui-card">
        <div className="calculator-section-heading"><div><h2>Your scenario</h2><p>Enter up to 100 signed returns in order. Results update immediately.</p></div></div>
        <div className="calculator-field"><label htmlFor={`${id}-capital`}>Starting capital (₹)</label><Input id={`${id}-capital`} type="number" min="0.01" max="1000000000000" step="0.01" value={capital} onChange={(event) => { setCapital(event.target.value); setMessage(""); }} /></div>
        <div className="calculator-field market-return-field"><label htmlFor={`${id}-returns`}>Returns (%)</label><Input id={`${id}-returns`} value={returns} onChange={(event) => { setReturns(event.target.value); setMessage(""); }} placeholder="-10, 20, -25" aria-describedby={`${id}-hint`} /><small id={`${id}-hint`}>Separate returns with commas; use a minus sign for a loss. Each return must be between -100% and 1000%.</small></div>
        <Button variant="secondary" onClick={() => { setCapital(""); setReturns(""); setMessage(""); }}>Reset</Button>
      </section>
      <section className="calculator-result ui-card" id="calculator-print">
        <div className="print-heading"><h1>Drawdown Simulator</h1></div>
        <div className="calculator-section-heading"><div><h2>Scenario results</h2><p>Illustrative only; not a forecast or financial advice.</p></div></div>
        {result ? <>
          <div className="result-highlight"><span>Maximum drawdown</span><strong>{percent(result.maximumDrawdown)}</strong></div>
          <dl className="result-lines"><div><dt>Starting capital</dt><dd>{money(result.capital)}</dd></div><div><dt>Ending balance</dt><dd>{money(result.balance)}</dd></div><div><dt>Final peak</dt><dd>{money(result.peak)}</dd></div><div><dt>Current drawdown</dt><dd>{percent(result.finalDrawdown)}</dd></div><div><dt>Return needed to reach peak</dt><dd>{result.recovery === null ? "Not possible from zero capital" : percent(result.recovery)}</dd></div></dl>
          <div className="market-table-wrap"><table className="risk-table"><thead><tr><th>Step</th><th>Return</th><th>Balance</th><th>Peak</th><th>Drawdown</th></tr></thead><tbody>{result.steps.map((step, index) => <tr key={index}><td>{index + 1}</td><td>{step.change.toString()}%</td><td>{money(step.balance)}</td><td>{money(step.peak)}</td><td>{percent(step.drawdown)}</td></tr>)}</tbody></table></div>
          <p className="result-disclaimer">Values are rounded for display. Fees, deposits and withdrawals are excluded. Results are hypothetical.</p>
          <div className="result-actions"><Button variant="secondary" onClick={() => void copy()}>Copy results</Button><Button variant="secondary" onClick={() => window.print()}>Print</Button></div><p className="calculator-message" role="status">{message}</p>
        </> : <div className="calculator-empty" role="status">{error ? <><strong>Check your inputs</strong><p>{error}</p></> : <><strong>Ready when you are</strong><p>Enter starting capital and at least one return.</p></>}</div>}
      </section>
    </div>
    <section className="market-education"><h2>Understanding the simulation</h2><p>Each return applies to the previous balance. The peak is the highest balance reached, including starting capital. Drawdown = (peak − balance) ÷ peak × 100; maximum drawdown is the largest decline observed in the sequence.</p><h3>Example</h3><p>Starting with ₹1,00,000, returns of -10%, 20%, and -25% produce balances of ₹90,000, ₹1,08,000, and ₹81,000. The maximum drawdown is 25%.</p><h3>Common mistakes</h3><p>Do not add percentages together or treat a simulated result as a forecast. A gain after a loss is applied to the reduced balance, not the original capital.</p><h3>Frequently asked questions</h3><h4>Can zero capital recover?</h4><p>No. A percentage return applied to zero remains zero; reaching the previous peak would require new capital, which this model does not include.</p><h4>Are charges included?</h4><p>No. Fees, taxes, deposits and withdrawals are excluded.</p><p>Related tools: <Link className="text-link" href="/tools/drawdown-calculator">Drawdown Calculator</Link> · <Link className="text-link" href="/tools/capital-depletion-simulator">Capital Depletion Simulator</Link> · <Link className="text-link" href="/tools/loss-recovery-calculator">Loss Recovery Calculator</Link></p></section>
  </>;
}
