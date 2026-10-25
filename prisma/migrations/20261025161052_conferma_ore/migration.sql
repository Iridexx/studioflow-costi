-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "approvedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TimeEntryApproval" (
    "id" TEXT NOT NULL,
    "timeEntryId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntryApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryApproval_timeEntryId_partnerId_key" ON "TimeEntryApproval"("timeEntryId", "partnerId");

-- AddForeignKey
ALTER TABLE "TimeEntryApproval" ADD CONSTRAINT "TimeEntryApproval_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryApproval" ADD CONSTRAINT "TimeEntryApproval_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Le ore già registrate restano confermate.
UPDATE "TimeEntry" SET "approvedAt" = "createdAt" WHERE "approvedAt" IS NULL;
