import { z } from "zod";
import { checklistItemSchema, tradeSchema } from "@/modules/journal/domain";
import { journalJson, JournalError, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";
import { requireFeature } from "@/services/entitlements";

const querySchema = z.object({ aStart: z.iso.date(), aEnd: z.iso.date(), bStart: z.iso.date(), bEnd: z.iso.date() }).strict();
const maxRecords = 5000;

export async function GET(request: Request) {
  return withJournalUser(request, async (userId) => {
    await requireFeature(userId, "advancedReports");
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const ranges = [{ start: query.aStart, end: query.aEnd }, { start: query.bStart, end: query.bEnd }];
    for (const range of ranges) {
      const days = (Date.parse(`${range.end}T00:00:00Z`) - Date.parse(`${range.start}T00:00:00Z`)) / 86400000;
      if (days < 0 || days > 1826) throw new JournalError("Each date range must be ordered and no longer than five years.", 400);
    }
    const [trades, reviews] = await Promise.all([
      prisma.journalTrade.findMany({
        where: { userId, draft: false, OR: ranges.map(({ start, end }) => ({ tradeDate: { gte: start, lte: end } })) },
        orderBy: [{ tradeDate: "asc" }, { id: "asc" }], take: maxRecords + 1, select: { id: true, record: true },
      }),
      prisma.dailyReview.findMany({
        where: { userId, OR: ranges.map(({ start, end }) => ({ date: { gte: start, lte: end } })) },
        orderBy: [{ date: "asc" }, { id: "asc" }], take: maxRecords + 1, select: { id: true, date: true, session: true, checklist: true },
      }),
    ]);
    if (trades.length > maxRecords || reviews.length > maxRecords) throw new JournalError("Too many records in these ranges. Select shorter periods.", 400);
    const parsedReviews = reviews.map(({ id, date, session, checklist }) => ({
      id, date, session, checklist: z.array(checklistItemSchema).parse(checklist).map((item) => ({ ...item, note: "" })),
    }));
    if (parsedReviews.reduce((total, review) => total + review.checklist.length, 0) > 50000) throw new JournalError("Too many checklist items in these ranges. Select shorter periods.", 400);
    return journalJson({
      trades: trades.map(({ id, record }) => {
        const trade = tradeSchema.parse(record);
        return { id, record: { ...trade, entryReason: "", exitReason: "", emotion: "", notes: "" } };
      }),
      reviews: parsedReviews,
    });
  });
}
