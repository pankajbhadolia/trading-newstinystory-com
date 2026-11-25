-- CreateTable
CREATE TABLE "JournalTrade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradeDate" TEXT,
    "session" TEXT,
    "instrument" TEXT,
    "symbol" TEXT,
    "draft" BOOLEAN NOT NULL DEFAULT true,
    "record" JSONB NOT NULL,
    "gross" DECIMAL(20,2),
    "net" DECIMAL(20,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplineRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisciplineRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DisciplineRule_weight_check" CHECK ("weight" BETWEEN 1 AND 10)
);

-- CreateTable
CREATE TABLE "DailyReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "checklist" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalScreenshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradeId" TEXT,
    "reviewId" TEXT,
    "slot" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalScreenshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "JournalScreenshot_parent_check" CHECK (("tradeId" IS NULL) <> ("reviewId" IS NULL)),
    CONSTRAINT "JournalScreenshot_slot_check" CHECK ("slot" BETWEEN 1 AND 5),
    CONSTRAINT "JournalScreenshot_size_check" CHECK (octet_length("data") BETWEEN 1 AND 5242880)
);

-- CreateIndex
CREATE INDEX "JournalTrade_userId_tradeDate_id_idx" ON "JournalTrade"("userId", "tradeDate", "id");

-- CreateIndex
CREATE INDEX "JournalTrade_userId_symbol_idx" ON "JournalTrade"("userId", "symbol");

-- CreateIndex
CREATE INDEX "DisciplineRule_userId_active_idx" ON "DisciplineRule"("userId", "active");

-- CreateIndex
CREATE INDEX "DailyReview_userId_date_idx" ON "DailyReview"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReview_userId_date_session_key" ON "DailyReview"("userId", "date", "session");

-- CreateIndex
CREATE INDEX "JournalScreenshot_userId_idx" ON "JournalScreenshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalScreenshot_tradeId_slot_key" ON "JournalScreenshot"("tradeId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "JournalScreenshot_reviewId_slot_key" ON "JournalScreenshot"("reviewId", "slot");

-- AddForeignKey
ALTER TABLE "JournalTrade" ADD CONSTRAINT "JournalTrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplineRule" ADD CONSTRAINT "DisciplineRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReview" ADD CONSTRAINT "DailyReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalScreenshot" ADD CONSTRAINT "JournalScreenshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalScreenshot" ADD CONSTRAINT "JournalScreenshot_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "JournalTrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalScreenshot" ADD CONSTRAINT "JournalScreenshot_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "DailyReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
