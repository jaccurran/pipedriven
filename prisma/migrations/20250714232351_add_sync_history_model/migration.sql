-- CreateTable
CREATE TABLE "sync_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "contactsProcessed" INTEGER NOT NULL DEFAULT 0,
    "contactsUpdated" INTEGER NOT NULL DEFAULT 0,
    "contactsCreated" INTEGER NOT NULL DEFAULT 0,
    "contactsFailed" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "sync_history" ADD CONSTRAINT "sync_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
