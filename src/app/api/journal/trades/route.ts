import { z } from "zod";
import { Prisma } from "@prisma/client";
import { calculateTrade, sessions, tradeSchema } from "@/modules/journal/domain";
import { journalJson, readJson, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";
import { accountAccess, requireHistoryDate, visibleTrades } from "@/services/entitlements";

const querySchema = z.object({
  q: z.string().max(100).default(""),
  id: z.string().max(128).default(""),
  date: z.union([z.iso.date(), z.literal("")]).default(""),
  session: z.union([z.enum(sessions), z.literal("")]).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  summaryDate: z.union([z.iso.date(), z.literal("")]).default(""),
}).strict();

export async function GET(request: Request) {
  return withJournalUser(request, async (userId) => {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const { cutoff } = await accountAccess(userId);
    if (query.date) requireHistoryDate(query.date, cutoff);
    const where: Prisma.JournalTradeWhereInput = {
      userId,
      AND: [visibleTrades(cutoff)],
      ...(query.id ? { id: query.id } : {}),
      ...(query.date ? { tradeDate: query.date } : {}),
      ...(query.session ? { session: query.session } : {}),
      ...(query.q ? { OR: [
        { symbol: { contains: query.q, mode: "insensitive" } },
        { instrument: { contains: query.q, mode: "insensitive" } },
      ] } : {}),
    };
    const summaryDate = query.summaryDate || new Date().toISOString().slice(0, 10);
    const summary = async (prefix: string) => prisma.journalTrade.aggregate({
      where: { userId, draft: false, tradeDate: { startsWith: prefix, ...(cutoff ? { gte: cutoff } : {}) }, gross: { not: null } },
      _sum: { gross: true, net: true }, _count: { _all: true, net: true },
    });
    const [trades, count, day, month] = await Promise.all([
      prisma.journalTrade.findMany({ where, orderBy: [{ tradeDate: "desc" }, { id: "desc" }], take: 50, skip: (query.page - 1) * 50,
        select: { id: true, record: true, createdAt: true, updatedAt: true, screenshots: { select: { id: true, name: true, mimeType: true } } } }),
      prisma.journalTrade.count({ where }), summary(summaryDate), summary(summaryDate.slice(0, 7)),
    ]);
    return journalJson({ trades, count, page: query.page, summaryDate, day, month });
  });
}

export async function POST(request: Request) {
  return withJournalUser(request, async (userId) => {
    const trade = tradeSchema.parse(await readJson(request));
    const { cutoff } = await accountAccess(userId);
    requireHistoryDate(trade.date, cutoff);
    const calculation = calculateTrade(trade);
    const saved = await prisma.journalTrade.create({ data: {
      userId, tradeDate: trade.date, session: trade.session, instrument: trade.instrument,
      symbol: trade.symbol.trim(), draft: trade.draft, record: trade,
      gross: calculation?.gross ?? null, net: calculation?.net ?? null,
    }, select: { id: true } });
    return journalJson(saved, 201);
  });
}
