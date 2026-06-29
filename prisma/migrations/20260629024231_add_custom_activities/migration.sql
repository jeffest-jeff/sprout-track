-- CreateTable
CREATE TABLE "CustomActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '⭐',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderIntervalHours" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "CustomActivity_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomActivityField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customActivityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "unit" TEXT,
    "options" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "CustomActivityField_customActivityId_fkey" FOREIGN KEY ("customActivityId") REFERENCES "CustomActivity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "babyId" TEXT NOT NULL,
    "caretakerId" TEXT,
    "customActivityId" TEXT NOT NULL,
    "time" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "CustomActivityLog_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomActivityLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomActivityLog_caretakerId_fkey" FOREIGN KEY ("caretakerId") REFERENCES "Caretaker" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomActivityLog_customActivityId_fkey" FOREIGN KEY ("customActivityId") REFERENCES "CustomActivity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomActivityLogValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customActivityLogId" TEXT NOT NULL,
    "customActivityFieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "CustomActivityLogValue_customActivityLogId_fkey" FOREIGN KEY ("customActivityLogId") REFERENCES "CustomActivityLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomActivityLogValue_customActivityFieldId_fkey" FOREIGN KEY ("customActivityFieldId") REFERENCES "CustomActivityField" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyName" TEXT NOT NULL DEFAULT 'My Family',
    "securityPin" TEXT NOT NULL DEFAULT '111222',
    "authType" TEXT,
    "defaultBottleUnit" TEXT NOT NULL DEFAULT 'OZ',
    "defaultSolidsUnit" TEXT NOT NULL DEFAULT 'TBSP',
    "defaultHeightUnit" TEXT NOT NULL DEFAULT 'IN',
    "defaultWeightUnit" TEXT NOT NULL DEFAULT 'LB',
    "defaultTempUnit" TEXT NOT NULL DEFAULT 'F',
    "activitySettings" TEXT,
    "sleepLocationSettings" TEXT,
    "nurseryModeSettings" TEXT,
    "enableDebugTimer" BOOLEAN NOT NULL DEFAULT false,
    "enableDebugTimezone" BOOLEAN NOT NULL DEFAULT false,
    "enableBreastMilkTracking" BOOLEAN NOT NULL DEFAULT true,
    "includeSolidsInFeedTimer" BOOLEAN NOT NULL DEFAULT true,
    "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "timeFormat" TEXT NOT NULL DEFAULT '12h',
    "outboundWebhookUrl" TEXT,
    "outboundWebhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "outboundWebhookSecret" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "familyId" TEXT,
    CONSTRAINT "Settings_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Settings" ("activitySettings", "authType", "createdAt", "dateFormat", "defaultBottleUnit", "defaultHeightUnit", "defaultSolidsUnit", "defaultTempUnit", "defaultWeightUnit", "enableBreastMilkTracking", "enableDebugTimer", "enableDebugTimezone", "familyId", "familyName", "id", "includeSolidsInFeedTimer", "nurseryModeSettings", "securityPin", "sleepLocationSettings", "timeFormat", "updatedAt") SELECT "activitySettings", "authType", "createdAt", "dateFormat", "defaultBottleUnit", "defaultHeightUnit", "defaultSolidsUnit", "defaultTempUnit", "defaultWeightUnit", "enableBreastMilkTracking", "enableDebugTimer", "enableDebugTimezone", "familyId", "familyName", "id", "includeSolidsInFeedTimer", "nurseryModeSettings", "securityPin", "sleepLocationSettings", "timeFormat", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE INDEX "Settings_familyId_idx" ON "Settings"("familyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CustomActivity_familyId_idx" ON "CustomActivity"("familyId");

-- CreateIndex
CREATE INDEX "CustomActivity_deletedAt_idx" ON "CustomActivity"("deletedAt");

-- CreateIndex
CREATE INDEX "CustomActivityField_customActivityId_idx" ON "CustomActivityField"("customActivityId");

-- CreateIndex
CREATE INDEX "CustomActivityField_deletedAt_idx" ON "CustomActivityField"("deletedAt");

-- CreateIndex
CREATE INDEX "CustomActivityLog_familyId_idx" ON "CustomActivityLog"("familyId");

-- CreateIndex
CREATE INDEX "CustomActivityLog_babyId_idx" ON "CustomActivityLog"("babyId");

-- CreateIndex
CREATE INDEX "CustomActivityLog_caretakerId_idx" ON "CustomActivityLog"("caretakerId");

-- CreateIndex
CREATE INDEX "CustomActivityLog_customActivityId_idx" ON "CustomActivityLog"("customActivityId");

-- CreateIndex
CREATE INDEX "CustomActivityLog_deletedAt_idx" ON "CustomActivityLog"("deletedAt");

-- CreateIndex
CREATE INDEX "CustomActivityLog_time_idx" ON "CustomActivityLog"("time");

-- CreateIndex
CREATE INDEX "CustomActivityLogValue_customActivityLogId_idx" ON "CustomActivityLogValue"("customActivityLogId");

-- CreateIndex
CREATE INDEX "CustomActivityLogValue_customActivityFieldId_idx" ON "CustomActivityLogValue"("customActivityFieldId");
