-- CreateTable
CREATE TABLE "nx00_user" (
    "uu_uid" TEXT NOT NULL,
    "uu_acc" TEXT NOT NULL,
    "uu_pwd" TEXT NOT NULL,
    "uu_nam" TEXT NOT NULL,
    "uu_act" BOOLEAN NOT NULL DEFAULT true,
    "uu_sta" TEXT NOT NULL DEFAULT 'A',
    "uu_rmk" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "nx00_user_pkey" PRIMARY KEY ("uu_uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "nx00_user_uu_acc_key" ON "nx00_user"("uu_acc");
