-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- AlterTable: add dismissedConnectorNudge to UserConfig
ALTER TABLE "UserConfig" ADD COLUMN "dismissedConnectorNudge" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: UserConnectorConfig
CREATE TABLE "UserConnectorConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configJson" JSONB,
    "oauthTokens" TEXT,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConnectorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DeliveryLog
CREATE TABLE "DeliveryLog" (
    "id" TEXT NOT NULL,
    "summaryId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConnectorConfig_userId_idx" ON "UserConnectorConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConnectorConfig_userId_connectorId_key" ON "UserConnectorConfig"("userId", "connectorId");

-- CreateIndex
CREATE INDEX "DeliveryLog_summaryId_idx" ON "DeliveryLog"("summaryId");

-- CreateIndex
CREATE INDEX "DeliveryLog_connectorId_idx" ON "DeliveryLog"("connectorId");

-- CreateIndex
CREATE INDEX "DeliveryLog_status_idx" ON "DeliveryLog"("status");

-- AddForeignKey
ALTER TABLE "UserConnectorConfig" ADD CONSTRAINT "UserConnectorConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLog" ADD CONSTRAINT "DeliveryLog_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "JobHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
