-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradename" TEXT,
    "ruc" TEXT NOT NULL,
    "address" TEXT,
    "branchAddress" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "category" TEXT,
    "regime" TEXT,
    "isAccountingObliged" BOOLEAN NOT NULL DEFAULT false,
    "specialTaxpayerCode" TEXT,
    "withholdingAgentCode" TEXT,
    "establishmentCode" TEXT NOT NULL DEFAULT '001',
    "emissionPointCode" TEXT NOT NULL DEFAULT '001',
    "isProduction" BOOLEAN NOT NULL DEFAULT false,
    "logo" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT '#2563eb',
    "taxpayerType" TEXT NOT NULL DEFAULT 'EMPRESA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_ruc_key" ON "Business"("ruc");
