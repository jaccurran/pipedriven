/*
  Warnings:

  - The `pipedriveActivityId` column on the `activities` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "lastPipedriveSyncAttempt" TIMESTAMP(3),
ADD COLUMN     "lastPipedriveUpdate" TIMESTAMP(3),
ADD COLUMN     "pipedriveSyncAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "replicatedToPipedrive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updateSyncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
DROP COLUMN "pipedriveActivityId",
ADD COLUMN     "pipedriveActivityId" INTEGER;

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "updateSyncStatus" TEXT NOT NULL DEFAULT 'SYNCED';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "lastPipedriveUpdate" TIMESTAMP(3),
ADD COLUMN     "updateSyncStatus" TEXT NOT NULL DEFAULT 'SYNCED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pipedriveUserId" INTEGER;
