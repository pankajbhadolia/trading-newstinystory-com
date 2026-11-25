import { z } from "zod";
import { makeReport } from "@/modules/analytics/report";
import { tradeSchema } from "@/modules/journal/domain";
import { requireFeature, requireHistoryDate } from "@/services/entitlements";
import { JournalError, journalJson, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";

const querySchema = z.object({ start: z.iso.date(), end: z.iso.date(), interval: z.enum(["daily", "monthly"]) }).strict();
export async function GET(request: Request) {
  return withJournalUser(request, async (userId) => {
    const { cutoff } = await requireFeature(userId, "basicReports");
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    requireHistoryDate(query.start, cutoff);
    const days = (Date.parse(`${query.end}T00:00:00Z`) - Date.parse(`${query.start}T00:00:00Z`)) / 86400000;
    if (days < 0 || days > 1826) throw new JournalError("Select an ordered range no longer than five years.", 400);
    const rows = await prisma.journalTrade.findMany({
      where: { userId, draft: false, tradeDate: { gte: query.start, lte: query.end } },
      orderBy: [{ tradeDate: "asc" }, { id: "asc" }], take: 5001, select: { id: true, record: true },
    });
    if (rows.length > 5000) throw new JournalError("Too many trades; select a shorter range.", 400);
    const report = makeReport({ trades: rows.map((row) => ({ id: row.id, record: tradeSchema.parse(row.record) })), reviews: [] }, query, query.interval, { instrument: "", strategy: "", session: "" });
    return journalJson({
      range: report.range, count: report.count, wins: report.wins, losses: report.losses, breakEven: report.breakEven,
      winRate: report.winRate, gross: report.gross, net: report.net, netCount: report.netCount,
      periods: report.periods, references: report.references,
    });
  });
}
