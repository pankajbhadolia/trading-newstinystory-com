"use client";

import { useId, useState } from "react";
import { Decimal } from "decimal.js";
import { Calculator, Clipboard, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { calculate, calculateGross, chargeFields, type CalculatorDefinition, type Direction, type Field, type Unit, type Values } from "@/modules/calculators/calculations";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 10 });
const decimal = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 });

function formatValue(value: number, unit: Unit) {
  if (unit === "money") return currency.format(value);
  if (unit === "price") return price.format(value);
  const formatted = value !== 0 && Math.abs(value) < 0.000001 ? value.toExponential(3) : decimal.format(value);
  if (unit === "percent") return `${formatted}%`;
  if (unit === "ratio") return `1 : ${formatted}`;
  return decimal.format(value);
}

export function TradingCalculator({ definition }: { definition: CalculatorDefinition }) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState<Direction>("long");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const id = useId();
  const fields = definition.charges ? [...definition.fields, ...chargeFields] : definition.fields;
  const missing = fields.some((field) => !field.optional && (inputs[field.key] ?? "").trim() === "");
  const values: Values = {};
  let inputError = "";
  for (const field of fields) {
    const raw = inputs[field.key]?.trim();
    if (raw) {
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        inputError ||= `${field.label} must be a valid number.`;
      } else {
        const precision = field.unit === "₹" ? 2 : 6;
        if (!field.integer && new Decimal(raw).decimalPlaces() > precision) inputError ||= `${field.label} supports at most ${precision} decimal places.`;
        values[field.key] = value;
      }
    }
  }

  let result: ReturnType<typeof calculate> | undefined;
  let error = inputError;
  let partial = false;
  if (!inputError && !missing && (!definition.charges || confirmed)) {
    try {
      result = calculate(definition.id, values, direction);
    } catch (caught) {
      if (!(caught instanceof Error)) throw caught;
      error = caught.message;
    }
  }
  const tradeMissing = definition.fields.some((field) => !field.optional && (inputs[field.key] ?? "").trim() === "");
  if (!result && !inputError && definition.charges && definition.id !== "brokerage" && !tradeMissing) {
    try {
      result = calculateGross(definition.id, values);
      partial = true;
    } catch (caught) {
      if (!(caught instanceof Error)) throw caught;
      error = caught.message;
    }
  }

  function reset() {
    setInputs({});
    setDirection("long");
    setConfirmed(false);
    setMessage("");
  }

  async function copyResult() {
    if (!result) return;
    const inputSummary = fields.filter((field) => inputs[field.key]?.trim()).map((field) => `${field.label}: ${inputs[field.key]}${field.unit ? ` ${field.unit}` : ""}`);
    const output = [definition.title, definition.explanation, definition.direction ? `Direction: ${direction}` : "", ...inputSummary, definition.charges && !inputs.brokerageCap?.trim() ? "Brokerage cap: none" : "", `${result.title}: ${formatValue(result.value, result.unit)}`, ...result.lines.map((line) => `${line.label}: ${formatValue(line.value, line.unit)}`), partial ? "Net P&L is not calculated; configure and confirm charges." : "", "Estimate only; verify assumptions and applicable charges."].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(output);
      setMessage("Results copied to clipboard.");
    } catch {
      setMessage("Could not copy results. Check clipboard permissions or use Print.");
    }
  }

  function renderField(field: Field) {
    const fieldId = `${id}-${field.key}`;
    return <div className="calculator-field" key={field.key}>
      <label htmlFor={fieldId}>{field.label}{field.optional && <span> (optional)</span>}</label>
      <div className="calculator-input-wrap">{field.unit && <span aria-hidden="true">{field.unit}</span>}<Input id={fieldId} type="number" inputMode={field.integer ? "numeric" : "decimal"} min={field.min} max={field.max} step={field.integer ? "1" : "any"} value={inputs[field.key] ?? ""} onChange={(event) => { setInputs((previous) => ({ ...previous, [field.key]: event.target.value })); setMessage(""); }} aria-describedby={field.hint ? `${fieldId}-hint` : undefined} /></div>
      {field.hint && <small id={`${fieldId}-hint`}>{field.hint}</small>}
    </div>;
  }

  return (
    <div className="calculator-layout">
      <section className="calculator-form ui-card" aria-labelledby={`${id}-inputs`}>
        <div className="calculator-section-heading"><div><h2 id={`${id}-inputs`}>Your inputs</h2><p>Fields are required unless optional. Rupee inputs allow 2 decimal places; rates allow 6.</p></div><Calculator size={19} /></div>
        {definition.direction && <div className="calculator-field direction-field"><label htmlFor={`${id}-direction`}>Trade direction</label><Select id={`${id}-direction`} value={direction} onChange={(event) => { setDirection(event.target.value === "short" ? "short" : "long"); setMessage(""); }}><option value="long">Long</option><option value="short">Short</option></Select></div>}
        <div className="calculator-fields">{definition.fields.map(renderField)}</div>
        {definition.charges && <div className="calculator-charges">
          <div className="charges-heading"><h3>Broker &amp; statutory charge assumptions</h3><p>Enter current rates for your broker, instrument, exchange and trade date. Enter 0 where a charge does not apply; no rates are supplied automatically.</p></div>
          <div className="calculator-fields">{chargeFields.map(renderField)}</div>
          <label className="charge-confirmation"><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setMessage(""); }} /><span>I have entered and checked every applicable rate. I understand the estimate excludes charges not entered here.</span></label>
          <p className="charge-note">One buy and one sell order are assumed. Brokerage is percentage plus flat fee per side, capped per side if specified. Exchange and regulatory rates apply to both turnovers; STT/CTT is applied separately by side; stamp duty applies to buy turnover. GST is calculated on brokerage, exchange and regulatory fees only. Include other fees and their taxes in other charges. Income tax, multiple orders and exercise/assignment are excluded. Fees are rounded to the nearest paise per displayed charge.</p>
        </div>}
        <Button variant="secondary" onClick={reset}><RotateCcw size={15} /> Reset</Button>
      </section>

      <section className="calculator-result ui-card" id="calculator-print" aria-labelledby={`${id}-result`}>
        <div className="print-heading"><h1>{definition.title}</h1><p>{definition.explanation}</p></div>
        <div className="calculator-section-heading"><div><h2 id={`${id}-result`}>Calculation breakdown</h2><p>Estimates update as you enter values.</p></div></div>
        {result ? <>
          <div className="result-highlight"><span>{result.title}</span><strong>{formatValue(result.value, result.unit)}</strong></div>
          <dl className="result-lines">{result.lines.map((line, index) => <div key={`${line.label}-${index}`}><dt>{line.label}</dt><dd>{formatValue(line.value, line.unit)}</dd></div>)}</dl>
          {partial && <p className="partial-note" role="status">Net P&amp;L is not calculated. Enter and confirm the applicable charge assumptions.</p>}
          {error && <p className="calculator-error" role="alert">{error}</p>}
          <div className="print-inputs"><h3>Inputs and assumptions</h3>{definition.direction && <p>Direction: {direction}</p>}{fields.filter((field) => inputs[field.key]?.trim()).map((field) => <p key={field.key}>{field.label}: {inputs[field.key]} {field.unit ?? ""}</p>)}{definition.charges && !inputs.brokerageCap?.trim() && <p>Brokerage cap: none</p>}</div>
          <p className="result-disclaimer">Illustrative estimate only. Verify prices, applicable charges and assumptions; this is not financial advice.</p>
          <div className="result-actions"><Button variant="secondary" onClick={copyResult}><Clipboard size={15} /> Copy results</Button><Button variant="secondary" onClick={() => window.print()}><Printer size={15} /> Print</Button></div>
          <p className="calculator-message" role="status">{message}</p>
        </> : <div className="calculator-empty" role="status">
          {error ? <><strong>Check your inputs</strong><p>{error}</p></> : <><strong>Ready when you are</strong><p>{missing ? "Enter all required inputs to calculate." : "Confirm your charge assumptions to calculate."}</p></>}
        </div>}
      </section>
    </div>
  );
}
