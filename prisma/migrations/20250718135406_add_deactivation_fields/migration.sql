-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "isSystemActivity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "systemAction" TEXT;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedBy" TEXT,
ADD COLUMN     "deactivationReason" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
