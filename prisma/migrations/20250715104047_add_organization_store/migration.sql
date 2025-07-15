-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "pipedriveOrgId" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "website" TEXT,
    "address" TEXT,
    "country" TEXT,
    "city" TEXT,
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_pipedriveOrgId_key" ON "organizations"("pipedriveOrgId");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
