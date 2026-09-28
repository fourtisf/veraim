-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "emailOrWallet" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_emailOrWallet_key" ON "waitlist"("emailOrWallet");
