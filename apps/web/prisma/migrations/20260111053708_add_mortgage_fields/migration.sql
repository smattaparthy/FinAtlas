-- AlterTable
ALTER TABLE "User" ADD COLUMN "anthropicApiKey" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "memberId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "principal" REAL NOT NULL,
    "currentBalance" REAL NOT NULL,
    "interestRate" REAL NOT NULL,
    "monthlyPayment" REAL NOT NULL,
    "startDate" DATETIME NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "propertyAddress" TEXT,
    "propertyZipCode" TEXT,
    "propertyCity" TEXT,
    "propertyState" TEXT,
    "propertyCounty" TEXT,
    "propertyValue" REAL,
    "annualPropertyTax" REAL,
    "annualHomeInsurance" REAL,
    "monthlyHOAFees" REAL,
    "monthlyPMI" REAL,
    "pmiRequired" BOOLEAN NOT NULL DEFAULT false,
    "insuranceProvider" TEXT,
    "hoaName" TEXT,
    CONSTRAINT "Loan_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Loan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Loan" ("createdAt", "currentBalance", "id", "interestRate", "memberId", "monthlyPayment", "name", "principal", "scenarioId", "startDate", "termMonths", "type", "updatedAt") SELECT "createdAt", "currentBalance", "id", "interestRate", "memberId", "monthlyPayment", "name", "principal", "scenarioId", "startDate", "termMonths", "type", "updatedAt" FROM "Loan";
DROP TABLE "Loan";
ALTER TABLE "new_Loan" RENAME TO "Loan";
CREATE INDEX "Loan_scenarioId_idx" ON "Loan"("scenarioId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
