CREATE TYPE "PaymentWebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "paymentId" TEXT,
    "providerPaymentId" TEXT,
    "status" "PaymentWebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "occurredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_providerEventId_key"
ON "PaymentWebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_idx"
ON "PaymentWebhookEvent"("provider");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_paymentId_idx"
ON "PaymentWebhookEvent"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_providerPaymentId_idx"
ON "PaymentWebhookEvent"("providerPaymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_status_idx"
ON "PaymentWebhookEvent"("status");

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent"
ADD CONSTRAINT "PaymentWebhookEvent_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unique provider reference
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key"
ON "Payment"("provider", "providerPaymentId");
