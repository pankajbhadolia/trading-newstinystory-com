import { z } from "zod";
import { JournalError, boundedBody, journalJson, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";
import { accountAccess, visibleReviews, visibleTrades } from "@/services/entitlements";

const maxBytes = 5 * 1024 * 1024;
const parentSchema = z.object({ kind: z.enum(["trade", "review"]), id: z.string().min(1).max(128) });

export async function GET(request: Request) {
  return withJournalUser(request, async (userId) => {
    const parent = parentSchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const { cutoff } = await accountAccess(userId);
    const owner = parent.kind === "trade"
      ? await prisma.journalTrade.findFirst({ where: { id: parent.id, userId, AND: [visibleTrades(cutoff)] }, select: { id: true } })
      : await prisma.dailyReview.findFirst({ where: { id: parent.id, userId, ...visibleReviews(cutoff) }, select: { id: true } });
    if (!owner) throw new JournalError("Record not found.", 404);
    const screenshots = await prisma.journalScreenshot.findMany({
      where: { userId, ...(parent.kind === "trade" ? { tradeId: parent.id } : { reviewId: parent.id }) },
      orderBy: { slot: "asc" }, select: { id: true, name: true, mimeType: true },
    });
    return journalJson({ screenshots });
  });
}

function imageType(bytes: Uint8Array) {
  const starts = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x52, 0x49, 0x46, 0x46]) && bytes.length >= 12 && [0x57, 0x45, 0x42, 0x50].every((v, i) => bytes[i + 8] === v)) return "image/webp";
  return null;
}

export async function POST(request: Request) {
  return withJournalUser(request, async (userId) => {
    const type = request.headers.get("content-type");
    if (!type?.toLowerCase().startsWith("multipart/form-data;")) throw new JournalError("Expected multipart image upload.", 415);
    const bytes = await boundedBody(request, maxBytes + 131072);
    let form: FormData;
    try { form = await new Request(request.url, { method: "POST", headers: { "content-type": type }, body: new Blob([bytes]) }).formData(); }
    catch { throw new JournalError("Invalid image upload.", 400); }
    const parent = parentSchema.parse({ kind: form.get("kind"), id: form.get("id") });
    const { cutoff } = await accountAccess(userId);
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > maxBytes) throw new JournalError("Screenshot must be between 1 byte and 5 MB.", 400);
    const data = new Uint8Array(await file.arrayBuffer());
    const mimeType = imageType(data);
    if (!mimeType || file.type !== mimeType) throw new JournalError("Only PNG, JPEG or WebP screenshots are allowed.", 400);
    const name = file.name.replace(/[^\w. -]/g, "_").slice(0, 120) || "screenshot";
    const saved = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${`${parent.kind}:${parent.id}`}))`;
      const owner = parent.kind === "trade"
        ? await tx.journalTrade.findFirst({ where: { id: parent.id, userId, AND: [visibleTrades(cutoff)] }, select: { id: true } })
        : await tx.dailyReview.findFirst({ where: { id: parent.id, userId, ...visibleReviews(cutoff) }, select: { id: true } });
      if (!owner) throw new JournalError("Record not found.", 404);
      const existing = await tx.journalScreenshot.findMany({ where: { userId, ...(parent.kind === "trade" ? { tradeId: parent.id } : { reviewId: parent.id }) }, select: { slot: true } });
      const slot = [1, 2, 3, 4, 5].find((item) => !existing.some((entry) => entry.slot === item));
      if (!slot) throw new JournalError("Each record can have at most 5 screenshots.", 400);
      return tx.journalScreenshot.create({
        data: { userId, ...(parent.kind === "trade" ? { tradeId: parent.id } : { reviewId: parent.id }), slot, name, mimeType, data },
        select: { id: true, name: true, mimeType: true },
      });
    });
    return journalJson(saved, 201);
  });
}
