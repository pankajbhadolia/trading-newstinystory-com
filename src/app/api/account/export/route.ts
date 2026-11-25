import { privateHeaders, withJournalUser } from "@/services/journal-api";
import { prisma } from "@/services/prisma";
import { logServerError } from "@/services/operational-log";

async function* rows<T extends { id: string }>(fetchPage: (cursor: string | undefined) => Promise<T[]>) {
  let cursor: string | undefined;
  while (true) {
    const page = await fetchPage(cursor);
    if (!page.length) return;
    for (const item of page) yield item;
    cursor = page[page.length - 1].id;
  }
}

export async function GET(request: Request) {
  return withJournalUser(request, async (userId) => {
    const profile = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true, preference: true, subscription: true },
    });
    const page = (cursor: string | undefined, take = 50) => ({ orderBy: { id: "asc" as const }, take, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    const datasets = {
      assessments: () => rows((cursor) => prisma.riskAssessment.findMany({ where: { userId }, ...page(cursor) })),
      trades: () => rows((cursor) => prisma.journalTrade.findMany({ where: { userId }, ...page(cursor) })),
      rules: () => rows((cursor) => prisma.disciplineRule.findMany({ where: { userId }, ...page(cursor) })),
      reviews: () => rows((cursor) => prisma.dailyReview.findMany({ where: { userId }, ...page(cursor) })),
      screenshots: () => rows(async (cursor) => (await prisma.journalScreenshot.findMany({ where: { userId }, ...page(cursor, 1) })).map(({ data, ...rest }) => ({ ...rest, dataBase64: Buffer.from(data).toString("base64") }))),
      subscriptionHistory: () => rows((cursor) => prisma.subscriptionEvent.findMany({ where: { userId }, ...page(cursor) })),
      upgradeRequests: () => rows((cursor) => prisma.upgradeRequest.findMany({ where: { userId }, ...page(cursor) })),
    };
    async function* generate() {
      yield `{"exportedAt":${JSON.stringify(new Date().toISOString())},"profile":${JSON.stringify(profile)}`;
      for (const [name, getRows] of Object.entries(datasets)) {
        yield `,${JSON.stringify(name)}:[`;
        let first = true;
        for await (const item of getRows()) {
          yield `${first ? "" : ","}${JSON.stringify(item)}`;
          first = false;
        }
        yield "]";
      }
      yield "}";
    }
    const iterator = generate();
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const next = await iterator.next();
          if (next.done) controller.close(); else controller.enqueue(encoder.encode(next.value));
        } catch (error) {
          logServerError("account.export.failed", error);
          controller.error(error);
        }
      },
      async cancel() { await iterator.return(undefined); },
    });
    return new Response(stream, { headers: { ...privateHeaders, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=\"traders-command-centre-data.json\"" } });
  });
}
