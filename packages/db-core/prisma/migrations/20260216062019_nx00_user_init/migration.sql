/*
  Warnings:

  - You are about to drop the column `createdBy` on the `nx00_user` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `nx00_user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "nx00_user" DROP COLUMN "createdBy",
DROP COLUMN "updatedBy",
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "updated_by" TEXT;
