CREATE TYPE "PaymentPurpose" AS ENUM ('SALE', 'RENT', 'RENT_DEPOSIT');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "provider" TEXT,
    "providerPaymentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Payment_orderId_purpose_key" UNIQUE ("orderId", "purpose"),
    CONSTRAINT "Payment_idempotencyKey_key" UNIQUE ("idempotencyKey"),
    CONSTRAINT "Payment_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "Payment_currency_check" CHECK (char_length("currency") = 3 AND "currency" ~ '^[A-Z]{3}$'),
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_purpose_idx" ON "Payment"("purpose");
CREATE INDEX "Payment_currency_idx" ON "Payment"("currency");
CREATE INDEX "Payment_provider_idx" ON "Payment"("provider");
