-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "source" TEXT DEFAULT 'LOCAL';
