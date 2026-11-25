import { Decimal } from "decimal.js";
import { z } from "zod";

export const sessions = ["Pre-market", "Morning", "Afternoon", "Full day", "After hours"] as const;
export const instruments = ["Equity", "Futures", "Options", "Other"] as const;
export const categories = ["Pre-market preparation", "Entry discipline", "Risk management", "Stop-loss adherence", "Profit booking", "Overtrading prevention", "Expiry-day rules", "Post-market review"] as const;

const date = z.iso.date();
const text = (length: number) => z.string().max(length);
const price = z.number().finite().min(0.01).max(1_000_000_000).multipleOf(0.01).nullable();
const charge = z.number().finite().min(0).max(1_000_000_000).multipleOf(0.01).nullable();

export const executionSchema = z.object({
  side: z.enum(["ENTRY", "EXIT"]),
  price,
  quantity: z.number().int().min(1).max(1_000_000).nullable(),
}).strict();

export const tradeSchema = z.object({
  date: date.nullable(),
  session: z.enum(sessions).nullable(),
  instrument: z.enum(instruments).nullable(),
  symbol: text(40),
  segment: text(80),
  strikePrice: price,
  expiryDate: date.nullable(),
  direction: z.enum(["BUY", "SELL"]).nullable(),
  executions: z.array(executionSchema).max(100),
  stopLoss: price,
  target: price,
  charges: charge,
  strategy: text(200),
  entryReason: text(4000),
  exitReason: text(4000),
  emotion: text(200),
  notes: text(10000),
  draft: z.boolean(),
}).strict().superRefine((trade, ctx) => {
  if (trade.draft) return;
  for (const [field, missing] of [
    ["date", !trade.date], ["session", !trade.session], ["instrument", !trade.instrument],
    ["symbol", !trade.symbol.trim()], ["direction", !trade.direction],
  ] as const) {
    if (missing) ctx.addIssue({ code: "custom", path: [field], message: `${field} is required for an active trade.` });
  }
  if (!trade.executions.some((item) => item.side === "ENTRY")) ctx.addIssue({ code: "custom", path: ["executions"], message: "Add at least one entry execution." });
  if (trade.executions.some((item) => item.price === null || item.quantity === null)) ctx.addIssue({ code: "custom", path: ["executions"], message: "Complete every execution or save as a draft." });
  const entry = trade.executions.filter((item) => item.side === "ENTRY").reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const exit = trade.executions.filter((item) => item.side === "EXIT").reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  if (exit > entry) ctx.addIssue({ code: "custom", path: ["executions"], message: "Exit quantity cannot exceed entry quantity." });
});

export type TradeInput = z.infer<typeof tradeSchema>;
export type TradeCalculation = { entryQuantity: number; exitQuantity: number; averageEntry: string; averageExit: string | null; gross: string | null; net: string | null; openQuantity: number };

export function calculateTrade(trade: TradeInput): TradeCalculation | null {
  if (!trade.direction || trade.executions.some((item) => item.price === null || item.quantity === null)) return null;
  const totals = (side: "ENTRY" | "EXIT") => trade.executions.filter((item) => item.side === side).reduce((total, item) => ({
    quantity: total.quantity + (item.quantity ?? 0),
    amount: total.amount.plus(new Decimal(item.price ?? 0).mul(item.quantity ?? 0)),
  }), { quantity: 0, amount: new Decimal(0) });
  const entry = totals("ENTRY");
  const exit = totals("EXIT");
  if (!entry.quantity || exit.quantity > entry.quantity) return null;
  const averageEntry = entry.amount.div(entry.quantity);
  const averageExit = exit.quantity ? exit.amount.div(exit.quantity) : null;
  const gross = averageExit ? averageExit.minus(averageEntry).mul(exit.quantity).mul(trade.direction === "BUY" ? 1 : -1).toDecimalPlaces(2, Decimal.ROUND_HALF_UP) : null;
  const net = gross !== null && trade.charges !== null ? gross.minus(trade.charges).toDecimalPlaces(2, Decimal.ROUND_HALF_UP) : null;
  return {
    entryQuantity: entry.quantity,
    exitQuantity: exit.quantity,
    averageEntry: averageEntry.toFixed(6),
    averageExit: averageExit?.toFixed(6) ?? null,
    gross: gross?.toFixed(2) ?? null,
    net: net?.toFixed(2) ?? null,
    openQuantity: entry.quantity - exit.quantity,
  };
}

export const ruleSchema = z.object({
  category: z.enum(categories),
  title: z.string().trim().min(1).max(200),
  weight: z.number().int().min(1).max(10),
  active: z.boolean(),
}).strict();
export type RuleInput = z.infer<typeof ruleSchema>;

export const checklistItemSchema = z.object({
  ruleId: z.string().min(1).max(128),
  category: z.enum(categories),
  title: z.string().min(1).max(200),
  weight: z.number().int().min(1).max(10),
  status: z.enum(["PENDING", "DONE", "VIOLATED", "NA"]),
  note: z.string().max(1000),
}).strict();
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export function disciplineScore(items: ChecklistItem[]) {
  const applicable = items.filter((item) => item.status !== "NA");
  const total = applicable.reduce((sum, item) => sum + item.weight, 0);
  const done = applicable.filter((item) => item.status === "DONE").reduce((sum, item) => sum + item.weight, 0);
  return total ? new Decimal(done).mul(100).div(total).toDecimalPlaces(2).toNumber() : null;
}

export const reviewSchema = z.object({
  date,
  session: z.enum(sessions),
  notes: text(10000),
  responses: z.array(z.object({ ruleId: z.string().min(1).max(128), status: z.enum(["PENDING", "DONE", "VIOLATED", "NA"]), note: text(1000) }).strict()).max(200),
}).strict().superRefine((data, ctx) => {
  if (new Set(data.responses.map((item) => item.ruleId)).size !== data.responses.length) ctx.addIssue({ code: "custom", path: ["responses"], message: "Duplicate checklist item." });
});

export const starterRules: RuleInput[] = [
  { category: "Pre-market preparation", title: "Review the market context and trading plan", weight: 1, active: true },
  { category: "Entry discipline", title: "Enter only when the planned setup is present", weight: 1, active: true },
  { category: "Risk management", title: "Check position size and loss limits before entry", weight: 2, active: true },
  { category: "Stop-loss adherence", title: "Respect the planned stop-loss", weight: 2, active: true },
  { category: "Profit booking", title: "Follow the planned exit and profit-booking rules", weight: 1, active: true },
  { category: "Overtrading prevention", title: "Stop when the daily trading limit is reached", weight: 1, active: true },
  { category: "Expiry-day rules", title: "Review expiry-specific risks and restrictions", weight: 1, active: true },
  { category: "Post-market review", title: "Record and review the session", weight: 1, active: true },
];
