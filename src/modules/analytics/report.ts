import { Decimal as DecimalBase } from "decimal.js";
import { calculateTrade, checklistItemSchema, disciplineScore, tradeSchema } from "../journal/domain.ts";
import { z } from "zod";

export const analyticsTradeSchema = z.object({ id: z.string(), record: tradeSchema });
export const analyticsReviewSchema = z.object({
  id: z.string(), date: z.iso.date(), session: z.string(), checklist: z.array(checklistItemSchema),
});
export const analyticsDataSchema = z.object({ trades: z.array(analyticsTradeSchema), reviews: z.array(analyticsReviewSchema) });
export type AnalyticsTrade = z.infer<typeof analyticsTradeSchema>;
export type AnalyticsReview = z.infer<typeof analyticsReviewSchema>;
export type Granularity = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type Range = { start: string; end: string };

const Decimal = DecimalBase.clone({ precision: 40 });
export function moneyDifference(a: string, b: string) { return new Decimal(a).minus(b).toFixed(2); }
type Realized = { id: string; date: string; session: string; symbol: string; instrument: string; strategy: string; gross: DecimalBase; net: DecimalBase | null; units: number; riskReward: DecimalBase | null };
export type Reference = { id: string; date: string; session: string; symbol: string };

function average(values: DecimalBase[]) {
  return values.length ? Decimal.sum(...values).div(values.length) : null;
}
function money(value: DecimalBase | null) { return value === null ? null : value.toFixed(2); }
function reference(trade: Realized): Reference { return { id: trade.id, date: trade.date, session: trade.session, symbol: trade.symbol }; }

function realizedTrade({ id, record }: AnalyticsTrade): Realized | null {
  if (record.draft || !record.date || !record.session || !record.instrument) return null;
  const calculation = calculateTrade(record);
  if (!calculation || calculation.gross === null) return null;
  const entries = record.executions.filter((item) => item.side === "ENTRY");
  const entryAmount = entries.reduce((sum, item) => sum.plus(new Decimal(item.price ?? 0).mul(item.quantity ?? 0)), new Decimal(0));
  const entry = entryAmount.div(calculation.entryQuantity);
  let ratio: DecimalBase | null = null;
  if (record.stopLoss !== null && record.target !== null && record.direction) {
    const direction = record.direction === "BUY" ? 1 : -1;
    const risk = entry.minus(record.stopLoss).mul(direction);
    const reward = new Decimal(record.target).minus(entry).mul(direction);
    if (risk.gt(0) && reward.gt(0)) ratio = reward.div(risk);
  }
  return {
    id, date: record.date, session: record.session, symbol: record.symbol,
    instrument: record.instrument, strategy: record.strategy.trim() || "Not recorded",
    gross: new Decimal(calculation.gross), net: calculation.net === null ? null : new Decimal(calculation.net),
    units: calculation.entryQuantity, riskReward: ratio,
  };
}

function bucket(date: string, granularity: Granularity) {
  if (granularity === "daily") return date;
  if (granularity === "monthly") return date.slice(0, 7);
  if (granularity === "yearly") return date.slice(0, 4);
  if (granularity === "quarterly") return `${date.slice(0, 4)}-Q${Math.ceil(Number(date.slice(5, 7)) / 3)}`;
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return `Week of ${day.toISOString().slice(0, 10)}`;
}

function groupBy(trades: Realized[], key: (trade: Realized) => string) {
  const groups = new Map<string, Realized[]>();
  for (const trade of trades) {
    const name = key(trade);
    const group = groups.get(name) ?? [];
    group.push(trade);
    groups.set(name, group);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, group]) => ({
    label, count: group.length, gross: money(Decimal.sum(...group.map((trade) => trade.gross)))!,
    references: group.map(reference),
  }));
}

export function makeReport(data: { trades: AnalyticsTrade[]; reviews: AnalyticsReview[] }, range: Range, granularity: Granularity, filters: { instrument: string; strategy: string; session: string }) {
  const trades = data.trades.map(realizedTrade).filter((trade): trade is Realized => trade !== null &&
    trade.date >= range.start && trade.date <= range.end &&
    (!filters.instrument || trade.instrument === filters.instrument) &&
    (!filters.strategy || trade.strategy === filters.strategy) &&
    (!filters.session || trade.session === filters.session));
  const wins = trades.filter((trade) => trade.gross.gt(0));
  const losses = trades.filter((trade) => trade.gross.lt(0));
  const knownNet = trades.filter((trade) => trade.net !== null);
  const ratios = trades.flatMap((trade) => trade.riskReward ? [trade.riskReward] : []);
  const gross = trades.length ? Decimal.sum(...trades.map((trade) => trade.gross)) : null;
  const net = knownNet.length ? Decimal.sum(...knownNet.map((trade) => trade.net!)) : null;
  const grossWins = wins.length ? Decimal.sum(...wins.map((trade) => trade.gross)) : new Decimal(0);
  const grossLosses = losses.length ? Decimal.sum(...losses.map((trade) => trade.gross)).abs() : new Decimal(0);
  const daily = groupBy(trades, (trade) => trade.date);
  let cumulative = new Decimal(0), peak = new Decimal(0), maxDrawdown = new Decimal(0), inDrawdown = false;
  const recovery: { date: string; references: Reference[] }[] = [];
  for (const day of daily) {
    cumulative = cumulative.plus(day.gross);
    if (inDrawdown && cumulative.gte(peak)) { recovery.push({ date: day.label, references: day.references }); inDrawdown = false; }
    if (cumulative.gt(peak)) peak = cumulative;
    const drawdown = peak.minus(cumulative);
    if (drawdown.gt(0)) inDrawdown = true;
    if (drawdown.gt(maxDrawdown)) maxDrawdown = drawdown;
  }
  const reviews = data.reviews.filter((review) => review.date >= range.start && review.date <= range.end && (!filters.session || review.session === filters.session));
  // Session reviews cannot be attributed to individual strategies or instruments.
  const applicableReviews = filters.instrument || filters.strategy ? [] : reviews;
  const scores = applicableReviews.flatMap((review) => {
    const score = disciplineScore(review.checklist);
    return score === null ? [] : [new Decimal(score)];
  });
  const sessionTrades = new Map<string, Reference[]>();
  for (const trade of trades) {
    const key = `${trade.date}:${trade.session}`;
    const list = sessionTrades.get(key) ?? [];
    list.push(reference(trade));
    sessionTrades.set(key, list);
  }
  const violations = applicableReviews.flatMap((review) => review.checklist.filter((item) => item.status === "VIOLATED").map((item) => ({
    ruleId: item.ruleId, title: item.title, category: item.category, date: review.date, session: review.session, reviewId: review.id,
    references: sessionTrades.get(`${review.date}:${review.session}`) ?? [],
  })));
  const repeated = new Map<string, typeof violations>();
  for (const violation of violations) {
    const group = repeated.get(violation.ruleId) ?? [];
    group.push(violation);
    repeated.set(violation.ruleId, group);
  }
  const days = (Date.parse(`${range.end}T00:00:00Z`) - Date.parse(`${range.start}T00:00:00Z`)) / 86400000 + 1;
  return {
    range, count: trades.length, wins: wins.length, losses: losses.length, breakEven: trades.length - wins.length - losses.length,
    winRate: trades.length ? new Decimal(wins.length).mul(100).div(trades.length).toFixed(2) : null,
    gross: money(gross), net: money(net), netCount: knownNet.length,
    averageWin: money(average(wins.map((trade) => trade.gross))),
    averageLoss: money(average(losses.map((trade) => trade.gross))),
    profitFactor: grossLosses.gt(0) ? grossWins.div(grossLosses).toFixed(2) : null,
    expectancy: money(average(trades.map((trade) => trade.gross))),
    maxDrawdown: trades.length ? money(maxDrawdown) : null,
    riskReward: average(ratios)?.toFixed(2) ?? null, riskRewardCount: ratios.length,
    averageUnits: average(trades.map((trade) => new Decimal(trade.units)))?.toFixed(2) ?? null,
    frequency: trades.length ? new Decimal(trades.length).div(days).toFixed(3) : null,
    discipline: average(scores)?.toFixed(2) ?? null, reviewCount: scores.length, reviewsExcluded: Boolean(filters.instrument || filters.strategy),
    reviewReferences: applicableReviews.filter((review) => disciplineScore(review.checklist) !== null).map(({ id, date, session }) => ({ id, date, session })),
    periods: groupBy(trades, (trade) => bucket(trade.date, granularity)),
    strategies: groupBy(trades, (trade) => trade.strategy),
    instruments: groupBy(trades, (trade) => trade.instrument),
    sessions: groupBy(trades, (trade) => trade.session),
    recovery, stopLossViolations: violations.filter((item) => item.category === "Stop-loss adherence"),
    repeatedViolations: [...repeated.values()].filter((items) => items.length >= 2),
    references: trades.map(reference),
  };
}
