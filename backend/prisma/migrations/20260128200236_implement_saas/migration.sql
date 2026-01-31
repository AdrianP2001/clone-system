/*
  Warnings:

  - A unique constraint covering the columns `[ruc]` on the table `Business` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ruc,businessId]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accessKey]` on the table `Document` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code,businessId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[type,establishmentCode,emissionPointCode,businessId]` on the table `Sequence` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `businessId` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `businessId` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `businessId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `businessId` to the `Sequence` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Client_ruc_key";

-- DropIndex
DROP INDEX "Document_number_key";

-- DropIndex
DROP INDEX "Product_code_key";

-- DropIndex
DROP INDEX "Sequence_type_establishmentCode_emissionPointCode_key";

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'FREE',
ALTER COLUMN "tradename" DROP NOT NULL,
ALTER COLUMN "branchAddress" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "regime" DROP NOT NULL,
ALTER COLUMN "isAccountingObliged" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "businessId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "businessId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "businessId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sequence" ADD COLUMN     "businessId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Business_ruc_key" ON "Business"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Client_ruc_businessId_key" ON "Client"("ruc", "businessId");

-- CreateIndex
CREATE INDEX "Document_businessId_idx" ON "Document"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_accessKey_key" ON "Document"("accessKey");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_businessId_key" ON "Product"("code", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Sequence_type_establishmentCode_emissionPointCode_businessI_key" ON "Sequence"("type", "establishmentCode", "emissionPointCode", "businessId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
