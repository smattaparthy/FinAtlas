-- CreateTable
CREATE TABLE "ActualExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "month" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActualExpense_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ActualExpense_scenarioId_idx" ON "ActualExpense"("scenarioId");

-- CreateIndex
CREATE INDEX "ActualExpense_scenarioId_month_idx" ON "ActualExpense"("scenarioId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ActualExpense_scenarioId_category_month_key" ON "ActualExpense"("scenarioId", "category", "month");
