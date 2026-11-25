import { JournalError, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withJournalUser(request, async (userId) => {
    const { id } = await params;
    const deleted = await prisma.dailyReview.deleteMany({ where: { id, userId } });
    if (!deleted.count) throw new JournalError("Review not found.", 404);
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  });
}
