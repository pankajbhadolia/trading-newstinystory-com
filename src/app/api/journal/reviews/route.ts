import { z } from "zod";
import { checklistItemSchema, reviewSchema, ruleSchema, sessions, type ChecklistItem } from "@/modules/journal/domain";
import { JournalError, journalJson, readJson, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";
import { accountAccess, requireHistoryDate, visibleReviews } from "@/services/entitlements";

const querySchema = z.object({ date: z.iso.date(), session: z.enum(sessions) }).strict();
const itemsSchema = z.array(checklistItemSchema);

function currentItems(rules: { id: string; category: string; title: string; weight: number; active: boolean }[]): ChecklistItem[] {
  return rules.map((rule) => {
    const parsed = ruleSchema.parse({ category: rule.category, title: rule.title, weight: rule.weight, active: rule.active });
    return { ruleId: rule.id, category: parsed.category, title: parsed.title, weight: parsed.weight, status: "PENDING", note: "" };
  });
}

export async function GET(request: Request) {
  return withJournalUser(request, async (userId) => {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const { cutoff } = await accountAccess(userId);
    requireHistoryDate(query.date, cutoff);
    const [review, rules, trades, history] = await Promise.all([
      prisma.dailyReview.findUnique({ where: { userId_date_session: { userId, ...query } }, include: { screenshots: { select: { id: true, name: true, mimeType: true } } } }),
      prisma.disciplineRule.findMany({ where: { userId, active: true }, orderBy: [{ category: "asc" }, { createdAt: "asc" }] }),
      prisma.journalTrade.findMany({ where: { userId, tradeDate: query.date, session: query.session }, orderBy: { createdAt: "asc" }, select: { id: true, record: true, gross: true, net: true } }),
      prisma.dailyReview.findMany({ where: { userId, ...visibleReviews(cutoff) }, orderBy: [{ date: "desc" }, { session: "asc" }], take: 100, select: { id: true, date: true, session: true } }),
    ]);
    const checklist = review ? itemsSchema.parse(review.checklist) : currentItems(rules);
    const availableRules = review ? currentItems(rules).filter((rule) => !checklist.some((item) => item.ruleId === rule.ruleId)) : [];
    return journalJson({ review, checklist, availableRules, trades, history });
  });
}

export async function POST(request: Request) {
  return withJournalUser(request, async (userId) => {
    const input = reviewSchema.parse(await readJson(request));
    const { cutoff } = await accountAccess(userId);
    requireHistoryDate(input.date, cutoff);
    const saved = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${`${input.date}:${input.session}`}))`;
      const where = { userId_date_session: { userId, date: input.date, session: input.session } };
      const previous = await tx.dailyReview.findUnique({ where });
      const current = currentItems(await tx.disciplineRule.findMany({ where: { userId, active: true }, orderBy: [{ category: "asc" }, { createdAt: "asc" }] }));
      const items = previous ? itemsSchema.parse(previous.checklist) : current;
      const responses = new Map(input.responses.map((response) => [response.ruleId, response]));
      if (previous) items.push(...current.filter((item) => responses.has(item.ruleId) && !items.some((existing) => existing.ruleId === item.ruleId)));
      if (responses.size !== items.length || items.some((item) => !responses.has(item.ruleId))) throw new JournalError("The checklist changed. Reload the review before saving.", 409);
      const checklist = items.map((item) => {
        const response = responses.get(item.ruleId);
        if (!response) throw new JournalError("The checklist changed. Reload the review before saving.", 409);
        return { ...item, status: response.status, note: response.note };
      });
      return tx.dailyReview.upsert({
        where,
        create: { userId, date: input.date, session: input.session, notes: input.notes, checklist },
        update: { notes: input.notes, checklist },
        select: { id: true },
      });
    });
    return journalJson(saved);
  });
}
