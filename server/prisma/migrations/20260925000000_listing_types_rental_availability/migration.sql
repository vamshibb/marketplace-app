-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "OrderStatus" ADD VALUE 'RETURN_PENDING';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "listingType" "ListingType" NOT NULL DEFAULT 'SALE',
ADD COLUMN     "maxRentalDays" INTEGER,
ADD COLUMN     "minRentalDays" INTEGER,
ADD COLUMN     "quantityAvailable" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "transactionType" "ListingType" NOT NULL DEFAULT 'SALE';
