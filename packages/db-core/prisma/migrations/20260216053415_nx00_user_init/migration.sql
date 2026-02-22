/*
  Warnings:

  - You are about to drop the column `created_by` on the `nx00_user` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `nx00_user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "nx00_user" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;
