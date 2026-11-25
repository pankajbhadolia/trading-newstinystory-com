import { calculateTrade, tradeSchema } from "@/modules/journal/domain";
import { privateHeaders, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";

function csvCell(value: string) {
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  return withJournalUser(request, async (userId) => {
    const records = await prisma.journalTrade.findMany({ where: { userId }, orderBy: [{ tradeDate: "desc" }, { id: "desc" }], select: { record: true } });
    const rows = [["Date", "Session", "Instrument", "Symbol", "Segment", "Strike", "Expiry", "Direction", "Executions (side: price x quantity)", "Entry average", "Exit average", "Entry units", "Exit units", "Open units", "Gross P&L", "Charges", "Net P&L", "Stop-loss", "Target", "Strategy", "Entry reason", "Exit reason", "Emotion", "Notes", "Draft"]];
    for (const { record } of records) {
      const t = tradeSchema.parse(record);
      const calc = calculateTrade(t);
      rows.push([t.date ?? "", t.session ?? "", t.instrument ?? "", t.symbol, t.segment, t.strikePrice?.toString() ?? "", t.expiryDate ?? "", t.direction ?? "",
        t.executions.map((e) => `${e.side}: ${e.price ?? "?"} x ${e.quantity ?? "?"}`).join("; "), calc?.averageEntry ?? "", calc?.averageExit ?? "",
        calc?.entryQuantity.toString() ?? "", calc?.exitQuantity.toString() ?? "", calc?.openQuantity.toString() ?? "", calc?.gross ?? "", t.charges?.toString() ?? "", calc?.net ?? "",
        t.stopLoss?.toString() ?? "", t.target?.toString() ?? "", t.strategy, t.entryReason, t.exitReason, t.emotion, t.notes, t.draft ? "Yes" : "No"]);
    }
    return new Response(`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`, {
      headers: { ...privateHeaders, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="trading-journal.csv"' },
    });
  });
}
