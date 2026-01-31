/*
  Warnings:

  - Made the column `tradename` on table `Business` required. This step will fail if there are existing NULL values in that column.
  - Made the column `address` on table `Business` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchAddress` on table `Business` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `Business` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `Business` required. This step will fail if there are existing NULL values in that column.
  - Made the column `category` on table `Business` required. This step will fail if there are existing NULL values in that column.
  - Made the column `regime` on table `Business` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Business_ruc_key";

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "notificationSettings" JSONB,
ALTER COLUMN "tradename" SET NOT NULL,
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "branchAddress" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "regime" SET NOT NULL,
ALTER COLUMN "isAccountingObliged" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "establishmentCode" TEXT NOT NULL,
    "emissionPointCode" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VENDEDOR',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "documentId" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sequence_type_establishmentCode_emissionPointCode_key" ON "Sequence"("type", "establishmentCode", "emissionPointCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Document_issueDate_idx" ON "Document"("issueDate");

-- CreateIndex
CREATE INDEX "Document_entityRuc_idx" ON "Document"("entityRuc");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
