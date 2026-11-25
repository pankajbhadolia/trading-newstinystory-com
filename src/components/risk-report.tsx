import type { Finding, RiskReport } from "@/modules/risk/assessment";
import { riskReportOrder, type RiskFocus } from "@/config/risk-areas";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function Findings({ title, items }: { title: string; items: Finding[] }) {
  return <section className="risk-report-section"><h3>{title}</h3>{items.length ? <ul>{items.map((item) => <li key={item.title}><strong>{item.title}:</strong> {item.reason}</li>)}</ul> : <p>None identified from the answers provided.</p>}</section>;
}

export function RiskReportView({ report, focus }: { report: RiskReport; focus?: RiskFocus }) {
  const scores = [
    { focus: "financial", title: "Financial risk capacity", value: report.scores.financial, reasons: report.scoreReasons.financial },
    { focus: "psychological", title: "Psychological risk tolerance", value: report.scores.psychological, reasons: report.scoreReasons.psychological },
    { focus: "readiness", title: "Trading readiness", value: report.scores.readiness, reasons: report.scoreReasons.readiness },
  ];
  const orderedScores = focus ? [...scores].sort((a, b) => Number(b.focus === focus) - Number(a.focus === focus)) : scores;
  const scoreGrid = <div className="risk-score-grid" key="scores">{orderedScores.map((score) => <section className={`ui-card risk-score${focus === score.focus ? " risk-focus" : ""}`} data-risk-focus={focus === score.focus ? focus : undefined} key={score.title}>{focus === score.focus && <p className="risk-focus-label">Selected focus</p>}<h3>{score.title}</h3><strong>{score.value}<small> / 100</small></strong><ul>{score.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></section>)}</div>;
  const findings = <div className="risk-findings" key="findings">
      <Findings title="Red flags" items={report.redFlags} />
      <Findings title="Caution indicators" items={report.cautions} />
      <Findings title="Favourable conditions" items={report.favourable} />
    </div>;
  const budget = <section className={`ui-card risk-report-section${focus === "budget" ? " risk-focus" : ""}`} data-risk-focus={focus === "budget" ? focus : undefined} key="budget">{focus === "budget" && <p className="risk-focus-label">Selected focus</p>}<h3>Illustrative risk budget and maximum loss limits</h3><p>{report.budget.reason}</p><dl className="risk-budget">
      <div><dt>Discretionary capital considered</dt><dd>{money.format(report.budget.capital)}</dd></div>
      <div><dt>Per trade</dt><dd>{money.format(report.budget.perTrade)}</dd></div>
      <div><dt>Per day</dt><dd>{money.format(report.budget.daily)}</dd></div>
      <div><dt>Per month</dt><dd>{money.format(report.budget.monthly)}</dd></div>
    </dl><p>These are hypothetical limits, not enforced stops. Losses may exceed them; a zero budget means postpone trading.</p></section>;
  const instruments = <section className={`risk-report-section${focus === "instruments" ? " risk-focus risk-focus-section" : ""}`} data-risk-focus={focus === "instruments" ? focus : undefined} key="instruments">{focus === "instruments" && <p className="risk-focus-label">Selected focus</p>}<h3>Instrument-specific readiness</h3><div className="risk-instruments">{report.instruments.map((item) => <article className="ui-card" key={item.name}><h4>{item.name}</h4><strong>{item.status}</strong><ul>{item.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></article>)}</div></section>;
  const sections = { scores: scoreGrid, findings, budget, instruments };
  return <div className="risk-report">
    <div><h2>Assessment report</h2><p>Provisional rules {report.version}. Educational decision-support only, not financial advice or a validated suitability assessment. Scores are not probabilities, guarantees, or permission to trade.</p></div>
    {riskReportOrder(focus).map((section) => sections[section])}
  </div>;
}
