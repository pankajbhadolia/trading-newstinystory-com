"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { AccountForm } from "@/components/account-form";
import { assessRisk, assessmentSchema, type Assessment, type RiskReport } from "@/modules/risk/assessment";
import { RiskReportView } from "@/components/risk-report";
import type { RiskFocus } from "@/config/risk-areas";

type Question = { key: keyof Assessment; label: string; kind: "money" | "select"; options?: [string, string][]; hint?: string };
const sections: { title: string; questions: Question[] }[] = [
  { title: "Personal information", questions: [{ key: "household", label: "Your household responsibility", kind: "select", options: [["self", "Mainly myself"], ["shared", "Shared responsibility"], ["primary", "Primary household provider"]], hint: "No name, age or date of birth is required." }] },
  { title: "Employment and income stability", questions: [{ key: "employment", label: "Income stability", kind: "select", options: [["stable", "Stable"], ["variable", "Variable"], ["unstable", "Unstable or uncertain"]] }] },
  { title: "Monthly income and expenses", questions: [{ key: "income", label: "Monthly take-home income (₹)", kind: "money" }, { key: "expenses", label: "Monthly household expenses (₹)", kind: "money", hint: "Exclude payments entered separately under obligations." }] },
  { title: "Financial obligations", questions: [{ key: "obligations", label: "Monthly debt and other financial obligations (₹)", kind: "money" }, { key: "highInterestDebt", label: "Do you have high-interest debt?", kind: "select", options: [["yes", "Yes"], ["no", "No"]] }] },
  { title: "Dependents and responsibilities", questions: [{ key: "dependents", label: "Number of dependents", kind: "select", options: [["none", "None"], ["one", "One"], ["multiple", "Two or more"]] }] },
  { title: "Emergency savings", questions: [{ key: "emergencySavings", label: "Accessible emergency savings (₹)", kind: "money", hint: "Exclude trading capital; count only funds available for emergencies." }] },
  { title: "Available investment capital", questions: [{ key: "capital", label: "Discretionary trading capital (₹)", kind: "money", hint: "Exclude emergency savings. This amount may be lost." }, { key: "borrowed", label: "Does this capital include borrowed money?", kind: "select", options: [["yes", "Yes"], ["no", "No"]] }, { key: "essentialFunds", label: "Does this capital include essential household funds?", kind: "select", options: [["yes", "Yes"], ["no", "No"]] }] },
  { title: "Trading experience", questions: [{ key: "experience", label: "Trading experience", kind: "select", options: [["none", "None"], ["under-one", "Less than one year"], ["one-two", "One to two years"], ["over-two", "More than two years"]] }, { key: "derivativesKnowledge", label: "Knowledge of futures and options", kind: "select", options: [["none", "None"], ["basic", "Basic"], ["experienced", "Experienced with risks and mechanics"]] }, { key: "plan", label: "Do you have a written plan and loss limits?", kind: "select", options: [["yes", "Yes"], ["no", "No"]] }] },
  { title: "Psychological risk tolerance", questions: [{ key: "lossResponse", label: "How do you generally respond to losses?", kind: "select", options: [["stop", "I would stop or feel distressed"], ["uneasy", "Uneasy, but could pause and review"], ["composed", "I can follow a plan without escalating risk"]] }, { key: "lossTolerance", label: "How much loss can you tolerate emotionally?", kind: "select", options: [["none", "None"], ["small", "A small loss"], ["moderate", "A moderate loss of discretionary capital"]] }] },
  { title: "Trading objectives", questions: [{ key: "objective", label: "Primary objective", kind: "select", options: [["learning", "Learning and practice"], ["long-term", "Long-term investing"], ["active", "Active trading"], ["income", "Regular income from trading"]] }] },
];

const moneyKeys = new Set(sections.flatMap((section) => section.questions.filter((question) => question.kind === "money").map((question) => question.key)));

function parseAnswers(values: Partial<Record<keyof Assessment, string>>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, moneyKeys.has(key as keyof Assessment) && value !== "" ? Number(value) : value]));
}

export function RiskAssessmentForm({ focus }: { focus?: RiskFocus }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Partial<Record<keyof Assessment, string>>>({});
  const [error, setError] = useState("");
  const [report, setReport] = useState<RiskReport>();
  const [answers, setAnswers] = useState<Assessment>();
  const [showAccount, setShowAccount] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function next() {
    const result = assessmentSchema.safeParse(parseAnswers(values));
    if (!result.success) {
      const issue = result.error.issues.find((item) => sections[step].questions.some((question) => question.key === item.path[0]));
      if (issue) {
        const question = sections[step].questions.find((item) => item.key === issue.path[0]);
        setError(question?.kind === "money" ? `Check ${question.label}: enter an amount between 0 and ₹1,000,000,000,000 with at most two decimal places.` : `Select an answer for ${question?.label}.`);
        return;
      }
    }
    setError("");
    if (step < sections.length - 1) {
      setStep(step + 1);
    } else if (result.success) {
      setAnswers(result.data);
      setReport(assessRisk(result.data));
      setSaveMessage("");
    } else {
      setError("Please review all sections before generating your report.");
    }
  }

  async function save() {
    if (!answers) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/risk/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, ruleVersion: report?.version }) });
      const data: { error?: string } = await response.json();
      if (response.status === 401) {
        setShowAccount(true);
        setSaveMessage("Sign in or create an account, then save your report.");
      } else if (!response.ok) {
        setSaveMessage(data.error || "Could not save your report.");
      } else {
        setShowAccount(false);
        setSaveMessage("Report saved. Open assessment history to compare reports.");
      }
    } catch {
      setSaveMessage("Could not reach the account service. Your report remains on this page.");
    } finally {
      setSaving(false);
    }
  }

  if (report) return <><RiskReportView report={report} focus={focus} /><p>Saving sends your answers to the server for validation and stores the resulting report, not your raw answers. Reports can contain sensitive financial information. Account storage is a preview; do not use real sensitive data.</p><div className="risk-actions"><Button variant="secondary" onClick={() => { setReport(undefined); setStep(0); }}>Edit answers</Button><Button disabled={saving} onClick={save}>{saving ? "Saving…" : "Save report"}</Button><Link className="text-link" href="/risk/history">View and compare history</Link></div><p role="status">{saveMessage}</p>{showAccount && <AccountForm onSuccess={() => { setShowAccount(false); setSaveMessage("Signed in. Select Save report to store this report."); }} />}</>;
  const section = sections[step];
  return <div className="ui-card risk-form">
    <p className="risk-progress">Section {step + 1} of {sections.length}</p>
    <h2>{section.title}</h2>
    <p>All questions are required. Your answers stay in this browser unless you choose to save the resulting report.</p>
    <div className="risk-questions">{section.questions.map((question) => <label key={question.key}>{question.label}
      {question.kind === "money" ? <Input type="number" inputMode="decimal" min="0" max="1000000000000" step="0.01" value={values[question.key] ?? ""} onChange={(event) => setValues({ ...values, [question.key]: event.target.value })} /> : <Select value={values[question.key] ?? ""} onChange={(event) => setValues({ ...values, [question.key]: event.target.value })}><option value="">Select an answer</option>{question.options?.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Select>}
      {question.hint && <small>{question.hint}</small>}
    </label>)}</div>
    {error && <p className="calculator-error" role="alert">{error}</p>}
    <div className="risk-actions">{step > 0 && <Button variant="secondary" onClick={() => { setStep(step - 1); setError(""); }}>Previous</Button>}<Button onClick={next}>{step === sections.length - 1 ? "Generate report" : "Continue"}</Button></div>
  </div>;
}
