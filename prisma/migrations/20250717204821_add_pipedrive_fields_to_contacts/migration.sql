-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "activitiesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "closedDealsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailMessagesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "followersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "lastActivityDate" TIMESTAMP(3),
ADD COLUMN     "lastIncomingMailTime" TIMESTAMP(3),
ADD COLUMN     "lastOutgoingMailTime" TIMESTAMP(3),
ADD COLUMN     "lostDealsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openDealsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wonDealsCount" INTEGER NOT NULL DEFAULT 0;
