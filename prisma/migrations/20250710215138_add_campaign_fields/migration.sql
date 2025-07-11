-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "budget" DOUBLE PRECISION,
ADD COLUMN     "status" "CampaignStatus" NOT NULL DEFAULT 'PLANNED',
ADD COLUMN     "targetLeads" INTEGER;
