-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "email" TEXT,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
