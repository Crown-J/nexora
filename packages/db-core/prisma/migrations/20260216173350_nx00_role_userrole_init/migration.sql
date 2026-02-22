/*
  Warnings:

  - You are about to alter the column `uu_sta` on the `nx00_user` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `created_by` on the `nx00_user` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - You are about to alter the column `updated_by` on the `nx00_user` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.

*/
-- DropForeignKey
ALTER TABLE "nx00_user" DROP CONSTRAINT "nx00_user_created_by_fkey";

-- DropForeignKey
ALTER TABLE "nx00_user" DROP CONSTRAINT "nx00_user_updated_by_fkey";

-- AlterTable
ALTER TABLE "nx00_user" ALTER COLUMN "uu_sta" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "created_by" SET DATA TYPE VARCHAR(15),
ALTER COLUMN "updated_by" SET DATA TYPE VARCHAR(15);

-- CreateTable
CREATE TABLE "nx00_role" (
    "id" VARCHAR(15) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),
    "updated_at" TIMESTAMP(3),
    "updated_by" VARCHAR(15),

    CONSTRAINT "nx00_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nx00_user_role" (
    "id" VARCHAR(15) NOT NULL,
    "user_id" VARCHAR(15) NOT NULL,
    "role_id" VARCHAR(15) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(15),

    CONSTRAINT "nx00_user_role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nx00_role_id_key" ON "nx00_role"("id");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_role_code_key" ON "nx00_role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_user_role_id_key" ON "nx00_user_role"("id");

-- CreateIndex
CREATE INDEX "nx00_user_role_user_id_idx" ON "nx00_user_role"("user_id");

-- CreateIndex
CREATE INDEX "nx00_user_role_role_id_idx" ON "nx00_user_role"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "nx00_user_role_user_id_role_id_key" ON "nx00_user_role"("user_id", "role_id");

-- AddForeignKey
ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user" ADD CONSTRAINT "nx00_user_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role" ADD CONSTRAINT "nx00_role_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_role" ADD CONSTRAINT "nx00_role_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "nx00_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "nx00_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nx00_user_role" ADD CONSTRAINT "nx00_user_role_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "nx00_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
