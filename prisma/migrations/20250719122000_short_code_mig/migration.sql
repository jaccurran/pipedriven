/*
  Warnings:

  - A unique constraint covering the columns `[shortcode]` on the table `campaigns` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "campaigns_shortcode_key" ON "campaigns"("shortcode");
