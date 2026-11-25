import { JournalError, privateHeaders, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";
import { accountAccess, visibleReviews, visibleTrades } from "@/services/entitlements";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return withJournalUser(request, async (userId) => {
    const { id } = await params;
    const { cutoff } = await accountAccess(userId);
    const image = await prisma.journalScreenshot.findFirst({ where: {
      id, userId, ...(cutoff ? { OR: [{ trade: { is: visibleTrades(cutoff) } }, { review: { is: visibleReviews(cutoff) } }] } : {}),
    }, select: { data: true, mimeType: true } });
    if (!image) throw new JournalError("Screenshot not found.", 404);
    return new Response(new Uint8Array(image.data), { headers: { ...privateHeaders, "Content-Type": image.mimeType, "Content-Disposition": "inline", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return withJournalUser(request, async (userId) => {
    const { id } = await params;
    const deleted = await prisma.journalScreenshot.deleteMany({ where: { id, userId } });
    if (!deleted.count) throw new JournalError("Screenshot not found.", 404);
    return new Response(null, { status: 204, headers: privateHeaders });
  });
}
