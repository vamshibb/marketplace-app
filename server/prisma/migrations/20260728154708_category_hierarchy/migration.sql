/*
  Warnings:

  - A unique constraint covering the columns `[parentId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/

-- DropIndex
DROP INDEX "Category_name_key";

-- AlterTable
ALTER TABLE "Category"
ADD COLUMN "description" TEXT,
ADD COLUMN "icon" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "isLeaf" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "parentId" TEXT,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Favorite"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Review"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Category_parentId_name_key"
ON "Category"("parentId", "name");

-- AddForeignKey
ALTER TABLE "Category"
ADD CONSTRAINT "Category_parentId_fkey"
FOREIGN KEY ("parentId")
REFERENCES "Category"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;