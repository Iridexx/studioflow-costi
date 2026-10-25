-- CreateEnum
CREATE TYPE "AgreementApprovalKind" AS ENUM ('VALIDATE', 'REOPEN');

-- DropIndex
DROP INDEX "AgreementApproval_versionId_partnerId_key";

-- AlterTable
ALTER TABLE "AgreementApproval" ADD COLUMN     "kind" "AgreementApprovalKind" NOT NULL DEFAULT 'VALIDATE';

-- AlterTable
ALTER TABLE "AgreementVersion" ADD COLUMN     "reopenReason" TEXT,
ADD COLUMN     "reopenRequestedAt" TIMESTAMP(3),
ADD COLUMN     "reopenedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "AgreementApproval_versionId_partnerId_kind_key" ON "AgreementApproval"("versionId", "partnerId", "kind");

