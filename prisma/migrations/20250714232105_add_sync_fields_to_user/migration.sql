-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastSyncTimestamp" TIMESTAMP(3),
ADD COLUMN     "syncStatus" TEXT NOT NULL DEFAULT 'NOT_SYNCED';
