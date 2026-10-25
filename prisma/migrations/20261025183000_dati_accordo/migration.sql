-- CreateEnum
CREATE TYPE "AgreementRole" AS ENUM ('A', 'B');

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "agreementRole" "AgreementRole",
ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "birthPlace" TEXT,
ADD COLUMN     "residence" TEXT,
ADD COLUMN     "taxCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Partner_agreementRole_key" ON "Partner"("agreementRole");
