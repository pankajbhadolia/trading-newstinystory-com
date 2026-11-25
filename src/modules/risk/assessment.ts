import { z } from "zod";

const money = z.number().finite().min(0).max(1_000_000_000_000).multipleOf(0.01);
export const assessmentSchema = z.object({
  household: z.enum(["self", "shared", "primary"]),
  employment: z.enum(["stable", "variable", "unstable"]),
  income: money,
  expenses: money,
  obligations: money,
  highInterestDebt: z.enum(["yes", "no"]),
  dependents: z.enum(["none", "one", "multiple"]),
  emergencySavings: money,
  capital: money,
  borrowed: z.enum(["yes", "no"]),
  essentialFunds: z.enum(["yes", "no"]),
  experience: z.enum(["none", "under-one", "one-two", "over-two"]),
  derivativesKnowledge: z.enum(["none", "basic", "experienced"]),
  plan: z.enum(["yes", "no"]),
  lossResponse: z.enum(["stop", "uneasy", "composed"]),
  lossTolerance: z.enum(["none", "small", "moderate"]),
  objective: z.enum(["learning", "long-term", "active", "income"]),
}).strict();

export type Assessment = z.infer<typeof assessmentSchema>;

// Immutable after release: create a new ruleset and version for any changes.
export const rulesV1 = Object.freeze({
  version: "1.0.0",
  emergencyMonthsMinimum: 3,
  emergencyMonthsComfortable: 6,
  surplusComfortable: 0.2,
  perTradePercent: 0.5,
  dailyPercent: 1,
  monthlyPercent: 3,
  readinessThreshold: 60,
  advancedThreshold: 75,
  psychologicalThreshold: 50,
});

export type Finding = { title: string; reason: string };
export type Instrument = { name: string; status: string; reasons: string[] };
export type RiskReport = {
  version: string;
  scores: { financial: number; psychological: number; readiness: number };
  scoreReasons: { financial: string[]; psychological: string[]; readiness: string[] };
  redFlags: Finding[];
  cautions: Finding[];
  favourable: Finding[];
  budget: { capital: number; perTrade: number; daily: number; monthly: number; reason: string };
  instruments: Instrument[];
};

const findingSchema = z.object({ title: z.string(), reason: z.string() });
export const reportSchema: z.ZodType<RiskReport> = z.object({
  version: z.string(),
  scores: z.object({ financial: z.number(), psychological: z.number(), readiness: z.number() }),
  scoreReasons: z.object({ financial: z.array(z.string()), psychological: z.array(z.string()), readiness: z.array(z.string()) }),
  redFlags: z.array(findingSchema),
  cautions: z.array(findingSchema),
  favourable: z.array(findingSchema),
  budget: z.object({ capital: z.number(), perTrade: z.number(), daily: z.number(), monthly: z.number(), reason: z.string() }),
  instruments: z.array(z.object({ name: z.string(), status: z.string(), reasons: z.array(z.string()) })),
});

function rounded(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function assessRisk(input: unknown): RiskReport {
  const a = assessmentSchema.parse(input);
  const r = rulesV1;
  const outgoings = a.expenses + a.obligations;
  const surplus = a.income - outgoings;
  const months = outgoings > 0 ? a.emergencySavings / outgoings : 0;
  const redFlags: Finding[] = [];
  const cautions: Finding[] = [];
  const favourable: Finding[] = [];
  if (outgoings === 0) cautions.push({ title: "No monthly outgoings entered", reason: "A meaningful emergency-fund ratio cannot be established; review all household expenses and obligations." });
  if (a.borrowed === "yes") redFlags.push({ title: "Borrowed capital", reason: "Debt-funded trading can create repayment obligations even after losses." });
  if (a.essentialFunds === "yes") redFlags.push({ title: "Essential household funds", reason: "Money needed for living expenses should not be exposed to trading losses." });
  if (a.highInterestDebt === "yes") redFlags.push({ title: "High-interest debt", reason: "Costly debt can undermine financial resilience and deserves attention first." });
  if (surplus <= 0) redFlags.push({ title: "No monthly surplus", reason: "Income does not exceed reported expenses and obligations." });
  if (outgoings > 0 && months < r.emergencyMonthsMinimum) redFlags.push({ title: `Emergency savings below ${r.emergencyMonthsMinimum} months`, reason: `The provisional minimum is ${r.emergencyMonthsMinimum} months of reported expenses and obligations.` });
  if (a.capital === 0) redFlags.push({ title: "No discretionary trading capital", reason: "No capital was identified as available for potential losses." });
  if (outgoings === 0) redFlags.push({ title: "Emergency coverage cannot be assessed", reason: "A zero expense and obligation total prevents a meaningful safety check." });
  if (a.employment !== "stable") cautions.push({ title: "Income stability", reason: "Variable or unstable income can make future commitments harder to meet." });
  if (months >= r.emergencyMonthsMinimum && months < r.emergencyMonthsComfortable) cautions.push({ title: "Limited emergency buffer", reason: `Savings cover at least ${r.emergencyMonthsMinimum} but less than ${r.emergencyMonthsComfortable} months of reported outgoings.` });
  if (a.dependents !== "none") cautions.push({ title: "Dependent responsibilities", reason: "Consider whether the household can still meet dependents' needs after a loss." });
  if (a.objective === "income") cautions.push({ title: "Income objective", reason: "Trading income is uncertain and should not be relied on for essential expenses." });
  if (a.lossResponse !== "composed" || a.lossTolerance === "none") cautions.push({ title: "Emotional response to losses", reason: "Consider practising without real capital before risking money." });
  if (months >= r.emergencyMonthsComfortable) favourable.push({ title: "Emergency savings", reason: `Reported savings cover at least ${r.emergencyMonthsComfortable} months of reported outgoings.` });
  if (surplus > 0) favourable.push({ title: "Positive monthly surplus", reason: "Reported income exceeds reported expenses and obligations." });
  if (a.plan === "yes") favourable.push({ title: "Trading plan", reason: "You reported having a written plan and loss limits; test and review it regularly." });
  if (a.borrowed === "no" && a.essentialFunds === "no") favourable.push({ title: "Capital source", reason: "You reported no borrowed or essential household funds in the trading capital." });

  const savingsPoints = months >= r.emergencyMonthsComfortable ? 30 : months >= r.emergencyMonthsMinimum ? 15 : 0;
  const surplusPoints = surplus > 0 ? (surplus / a.income >= r.surplusComfortable ? 25 : 15) : 0;
  const stabilityPoints = a.employment === "stable" ? 15 : a.employment === "variable" ? 8 : 0;
  const debtPoints = a.highInterestDebt === "no" ? 15 : 0;
  const sourcePoints = a.borrowed === "no" && a.essentialFunds === "no" && a.capital > 0 ? 15 : 0;
  const lossPoints = { none: 0, small: 20, moderate: 40 }[a.lossTolerance];
  const responsePoints = { stop: 10, uneasy: 20, composed: 35 }[a.lossResponse];
  const objectivePoints = { learning: 25, "long-term": 25, active: 15, income: 0 }[a.objective];
  const experiencePoints = { none: 0, "under-one": 10, "one-two": 20, "over-two": 35 }[a.experience];
  const knowledgePoints = { none: 0, basic: 10, experienced: 30 }[a.derivativesKnowledge];
  const planPoints = a.plan === "yes" ? 35 : 0;
  const financial = savingsPoints + surplusPoints + stabilityPoints + debtPoints + sourcePoints;
  const psychological = lossPoints + responsePoints + objectivePoints;
  const readiness = experiencePoints + knowledgePoints + planPoints;
  const blocked = redFlags.length > 0;
  const budgetReasons = [
    ...(blocked ? ["one or more red flags"] : []),
    ...(financial < r.readinessThreshold ? [`financial capacity below ${r.readinessThreshold}/100`] : []),
    ...(psychological < r.psychologicalThreshold ? [`psychological tolerance below ${r.psychologicalThreshold}/100`] : []),
    ...(a.plan === "no" ? ["no written plan"] : []),
    ...(a.lossTolerance === "none" ? ["no loss tolerance"] : []),
  ];
  const budgetCapital = budgetReasons.length ? 0 : a.capital;
  const budget = {
    capital: budgetCapital,
    perTrade: rounded(budgetCapital * r.perTradePercent / 100),
    daily: rounded(budgetCapital * r.dailyPercent / 100),
    monthly: rounded(budgetCapital * r.monthlyPercent / 100),
    reason: budgetReasons.length
      ? `The provisional budget is zero because of ${budgetReasons.join(", ")}. Address these concerns before considering trading.`
      : `Illustrative limits use ${r.perTradePercent}% per trade, ${r.dailyPercent}% per day and ${r.monthlyPercent}% per month of declared discretionary capital. These are not guarantees; gaps, slippage and leverage can exceed them.`,
  };
  const basicReasons = blocked ? redFlags.map((item) => item.title) : [];
  if (a.plan === "no") basicReasons.push("No written trading plan or loss limits reported");
  if (a.lossTolerance === "none") basicReasons.push("No tolerance for loss reported");
  const deliveryReasons = [...basicReasons];
  if (financial < r.readinessThreshold) deliveryReasons.push(`Financial capacity is below the provisional ${r.readinessThreshold}/100 threshold`);
  if (psychological < r.psychologicalThreshold) deliveryReasons.push(`Psychological tolerance is below the provisional ${r.psychologicalThreshold}/100 threshold`);
  if (a.experience === "none") deliveryReasons.push("No prior trading experience reported; consider learning or paper trading first");
  const activeReasons = [...basicReasons];
  if (readiness < r.readinessThreshold) activeReasons.push(`Readiness score is below the provisional ${r.readinessThreshold}/100 threshold`);
  if (financial < r.readinessThreshold) activeReasons.push(`Financial capacity is below the provisional ${r.readinessThreshold}/100 threshold`);
  if (psychological < r.psychologicalThreshold) activeReasons.push(`Psychological tolerance is below the provisional ${r.psychologicalThreshold}/100 threshold`);
  if (a.experience === "none" || a.experience === "under-one") activeReasons.push("Less than one year of experience reported");
  const advancedReasons = [...activeReasons];
  if (readiness < r.advancedThreshold) advancedReasons.push(`Readiness score is below the provisional ${r.advancedThreshold}/100 advanced threshold`);
  if (a.experience !== "over-two") advancedReasons.push("More than two years of experience not reported");
  if (a.derivativesKnowledge !== "experienced") advancedReasons.push("Experienced derivatives knowledge not reported");
  if (a.lossTolerance !== "moderate") advancedReasons.push("Reported loss tolerance is below the provisional advanced threshold");
  const instrument = (name: string, reasons: string[], extra: string, passed: string): Instrument => ({
    name,
    status: blocked ? "Postpone" : reasons.length ? "Avoid for now / learn first" : "Consider further research, not a recommendation",
    reasons: reasons.length ? [...reasons, extra] : [passed, extra, "These unvalidated checks cannot establish suitability; seek independent professional advice."],
  });
  return {
    version: r.version,
    scores: { financial, psychological, readiness },
    scoreReasons: {
      financial: [`Emergency buffer ${savingsPoints}/30`, `Monthly surplus ${surplusPoints}/25`, `Income stability ${stabilityPoints}/15`, `High-interest debt ${debtPoints}/15`, `Capital source ${sourcePoints}/15`],
      psychological: [`Loss tolerance ${lossPoints}/40`, `Loss response ${responsePoints}/35`, `Objective ${objectivePoints}/25`],
      readiness: [`Experience ${experiencePoints}/35`, `Derivatives knowledge ${knowledgePoints}/30`, `Written plan ${planPoints}/35`],
    },
    redFlags, cautions, favourable, budget,
    instruments: [
      instrument("Equity delivery", deliveryReasons, "Share prices can fall substantially; long-term ownership does not eliminate loss.", "You reported experience, a written plan, some loss tolerance and no financial red flags; capacity and psychological scores passed the provisional thresholds."),
      instrument("Equity intraday", activeReasons, "Intraday activity adds execution, liquidity and rapid-loss risks.", "You reported at least one year of experience and a written plan, with no red flags; the three scores passed the provisional thresholds."),
      instrument("Options buying", advancedReasons, "The entire premium can be lost; expiry and time decay matter.", "You reported over two years of experience, experienced derivatives knowledge, moderate loss tolerance and a written plan; all provisional thresholds passed."),
      instrument("Options selling", advancedReasons, "Losses can exceed the premium and may be theoretically unlimited; margin calls are possible.", "You reported over two years of experience, experienced derivatives knowledge, moderate loss tolerance and a written plan; all provisional thresholds passed."),
      instrument("Futures trading", advancedReasons, "Leverage and margin calls can cause losses exceeding the initial margin.", "You reported over two years of experience, experienced derivatives knowledge, moderate loss tolerance and a written plan; all provisional thresholds passed."),
    ],
  };
}
