-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "additionalInfo" TEXT,
ADD COLUMN     "authorizedXml" TEXT,
ADD COLUMN     "creditNoteReason" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "relatedDocumentAccessKey" TEXT,
ADD COLUMN     "relatedDocumentDate" TIMESTAMP(3),
ADD COLUMN     "relatedDocumentNumber" TEXT;
