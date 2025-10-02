/*
  Warnings:

  - A unique constraint covering the columns `[sectorId,code]` on the table `Service` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Service_code_key` ON `Service`;

-- CreateIndex
CREATE UNIQUE INDEX `Service_sectorId_code_key` ON `Service`(`sectorId`, `code`);
