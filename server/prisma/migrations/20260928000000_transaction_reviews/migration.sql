-- Preserve legacy rows: their orderId remains NULL.
ALTER TABLE "Review" ADD COLUMN "orderId" TEXT;
DROP INDEX "Review_userId_productId_key";
CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");
CREATE INDEX "Review_productId_idx" ON "Review"("productId");
CREATE INDEX "Review_userId_idx" ON "Review"("userId");
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "UserReview" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "revieweeId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserReview_orderId_reviewerId_revieweeId_key" ON "UserReview"("orderId", "reviewerId", "revieweeId");
CREATE INDEX "UserReview_revieweeId_idx" ON "UserReview"("revieweeId");
CREATE INDEX "UserReview_reviewerId_idx" ON "UserReview"("reviewerId");
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
