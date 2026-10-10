/*
  Warnings:

  - You are about to drop the column `dueDate` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `periodEnd` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `periodStart` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Payment` table. All the data in the column will be lost.
  - Added the required column `monthlyFee` to the `GroupStudent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nextBillingDate` to the `GroupStudent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GroupStudent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoiceId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Made the column `paidAt` on table `Payment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `paymentMethod` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "GroupStudent" DROP CONSTRAINT "GroupStudent_groupId_fkey";

-- DropForeignKey
ALTER TABLE "GroupStudent" DROP CONSTRAINT "GroupStudent_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_studentId_fkey";

-- DropIndex
DROP INDEX "GroupStudent_groupId_studentId_key";

-- DropIndex
DROP INDEX "Payment_paidAt_idx";

-- DropIndex
DROP INDEX "Payment_periodStart_periodEnd_idx";

-- DropIndex
DROP INDEX "Payment_status_idx";

-- DropIndex
DROP INDEX "Payment_studentId_idx";

-- DropIndex
DROP INDEX "Payment_tutorId_idx";

-- AlterTable
ALTER TABLE "GroupStudent" ADD COLUMN     "billingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "billingIntervalMonths" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "monthlyFee" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "nextBillingDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "dueDate",
DROP COLUMN "periodEnd",
DROP COLUMN "periodStart",
DROP COLUMN "status",
ADD COLUMN     "invoiceId" TEXT NOT NULL,
ALTER COLUMN "studentId" DROP NOT NULL,
ALTER COLUMN "paidAt" SET NOT NULL,
ALTER COLUMN "paidAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "paymentMethod" SET NOT NULL;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_tutorId_status_dueDate_idx" ON "Invoice"("tutorId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_studentId_dueDate_idx" ON "Invoice"("studentId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_enrollmentId_periodStart_key" ON "Invoice"("enrollmentId", "periodStart");

-- CreateIndex
CREATE INDEX "GroupStudent_billingEnabled_nextBillingDate_idx" ON "GroupStudent"("billingEnabled", "nextBillingDate");

-- CreateIndex
CREATE INDEX "Payment_tutorId_paidAt_idx" ON "Payment"("tutorId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- AddForeignKey
ALTER TABLE "GroupStudent" ADD CONSTRAINT "GroupStudent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupStudent" ADD CONSTRAINT "GroupStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "GroupStudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
