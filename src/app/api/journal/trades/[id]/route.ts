import { calculateTrade, tradeSchema } from "@/modules/journal/domain";
import { JournalError, journalJson, readJson, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";
import { accountAccess, requireHistoryDate, visibleTrades } from "@/services/entitlements";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  return withJournalUser(request, async (userId) => {
    const { id } = await params;
    const trade = tradeSchema.parse(await readJson(request));
    const { cutoff } = await accountAccess(userId);
    requireHistoryDate(trade.date, cutoff);
    const calculation = calculateTrade(trade);
    const result = await prisma.journalTrade.updateMany({ where: { id, userId, AND: [visibleTrades(cutoff)] }, data: {
      tradeDate: trade.date, session: trade.session, instrument: trade.instrument, symbol: trade.symbol.trim(),
      draft: trade.draft, record: trade, gross: calculation?.gross ?? null, net: calculation?.net ?? null,
    } });
    if (!result.count) throw new JournalError("Trade not found.", 404);
    return journalJson({ id });
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return withJournalUser(request, async (userId) => {
    const { id } = await params;
    const deleted = await prisma.journalTrade.deleteMany({ where: { id, userId } });
    if (!deleted.count) throw new JournalError("Trade not found.", 404);
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  });
}
