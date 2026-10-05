CREATE TABLE "AvailabilityBlock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "blockedFrom" DATE NOT NULL,
    "blockedTo" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AvailabilityBlock_dates_check" CHECK ("blockedFrom" < "blockedTo"),
    CONSTRAINT "AvailabilityBlock_quantity_check" CHECK ("quantity" >= 1),
    CONSTRAINT "AvailabilityBlock_reason_check" CHECK (char_length("reason") <= 200)
);
CREATE INDEX "AvailabilityBlock_productId_blockedFrom_blockedTo_idx" ON "AvailabilityBlock"("productId", "blockedFrom", "blockedTo");
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
