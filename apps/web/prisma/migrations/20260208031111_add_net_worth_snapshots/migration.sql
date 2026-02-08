-- CreateTable
CREATE TABLE "NetWorthSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "snapshotDate" DATETIME NOT NULL,
    "totalAssets" REAL NOT NULL,
    "totalLiabilities" REAL NOT NULL,
    "netWorth" REAL NOT NULL,
    "notes" TEXT,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NetWorthSnapshot_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NetWorthSnapshot_scenarioId_idx" ON "NetWorthSnapshot"("scenarioId");

-- CreateIndex
CREATE INDEX "NetWorthSnapshot_scenarioId_snapshotDate_idx" ON "NetWorthSnapshot"("scenarioId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "NetWorthSnapshot_scenarioId_snapshotDate_key" ON "NetWorthSnapshot"("scenarioId", "snapshotDate");
