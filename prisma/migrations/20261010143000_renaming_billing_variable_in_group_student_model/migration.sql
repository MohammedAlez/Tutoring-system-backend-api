/*
  Warnings:

  - You are about to drop the column `monthlyFee` on the `GroupStudent` table. All the data in the column will be lost.
  - Added the required column `billingFee` to the `GroupStudent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GroupStudent" DROP COLUMN "monthlyFee",
ADD COLUMN     "billingFee" DECIMAL(10,2) NOT NULL;
