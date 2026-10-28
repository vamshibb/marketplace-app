CREATE TYPE "RentalDisputeStatus" AS ENUM ('OPEN', 'RESOLVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RentalDispute" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "RentalDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentalDispute_orderId_key"
ON "RentalDispute"("orderId");

-- CreateIndex
CREATE INDEX "RentalDispute_openedById_idx"
ON "RentalDispute"("openedById");

-- CreateIndex
CREATE INDEX "RentalDispute_status_idx"
ON "RentalDispute"("status");

-- AddForeignKey
ALTER TABLE "RentalDispute"
ADD CONSTRAINT "RentalDispute_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalDispute"
ADD CONSTRAINT "RentalDispute_openedById_fkey"
FOREIGN KEY ("openedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
