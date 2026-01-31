-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "retentionTaxes" JSONB,
ADD COLUMN     "sustainingDocDate" TIMESTAMP(3),
ADD COLUMN     "sustainingDocNumber" TEXT,
ADD COLUMN     "sustainingDocTotal" DOUBLE PRECISION,
ADD COLUMN     "sustainingDocType" TEXT,
ADD COLUMN     "taxPeriod" TEXT;
