-- CreateEnum
CREATE TYPE "QuickActionMode" AS ENUM ('SIMPLE', 'DETAILED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activityReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "campaignUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quickActionMode" "QuickActionMode" NOT NULL DEFAULT 'SIMPLE',
ADD COLUMN     "syncStatusAlerts" BOOLEAN NOT NULL DEFAULT true;
