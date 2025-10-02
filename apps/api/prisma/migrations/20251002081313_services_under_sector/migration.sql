/*
  Warnings:

  - Added the required column `sectorId` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Service` ADD COLUMN `sectorId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Service_sectorId_idx` ON `Service`(`sectorId`);

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `Sector`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
