/*
  Warnings:

  - A unique constraint covering the columns `[shortcode]` on the table `campaigns` will be added. If there are existing duplicate values, this will fail.
*/

-- Step 1: Add the shortcode column as nullable
ALTER TABLE "campaigns" ADD COLUMN "shortcode" TEXT;

-- Step 2: Populate shortcodes for existing campaigns
-- This will be handled by the seed script after the migration

-- Step 3: Make the column required (this will be done after seeding)
-- ALTER TABLE "campaigns" ALTER COLUMN "shortcode" SET NOT NULL;

-- Step 4: Add unique constraint (this will be done after seeding)
-- CREATE UNIQUE INDEX "campaigns_shortcode_key" ON "campaigns"("shortcode");
