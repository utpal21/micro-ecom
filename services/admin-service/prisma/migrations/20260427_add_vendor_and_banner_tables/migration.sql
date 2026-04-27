-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('pending', 'processing', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "BannerStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateTable
CREATE TABLE "VendorSettlement" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "settlementPeriodStart" TIMESTAMP(3) NOT NULL,
    "settlementPeriodEnd" TIMESTAMP(3) NOT NULL,
    "totalOrders" INTEGER NOT NULL,
    "totalRevenuePaisa" BIGINT NOT NULL,
    "commissionPaisa" BIGINT NOT NULL,
    "netPayoutPaisa" BIGINT NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'pending',
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "BannerStatus" NOT NULL DEFAULT 'active',
    "displayFrom" TIMESTAMP(3) NOT NULL,
    "displayUntil" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorSettlement_vendorId_idx" ON "VendorSettlement"("vendorId");

-- CreateIndex
CREATE INDEX "VendorSettlement_status_idx" ON "VendorSettlement"("status");

-- CreateIndex
CREATE INDEX "VendorSettlement_period_idx" ON "VendorSettlement"("settlementPeriodStart", "settlementPeriodEnd");

-- CreateIndex
CREATE INDEX "Banner_status_idx" ON "Banner"("status");

-- CreateIndex
CREATE INDEX "Banner_position_idx" ON "Banner"("position");

-- CreateIndex
CREATE INDEX "Banner_displayPeriod_idx" ON "Banner"("displayFrom", "displayUntil");

-- AddForeignKey
ALTER TABLE "VendorSettlement" ADD CONSTRAINT "VendorSettlement_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;