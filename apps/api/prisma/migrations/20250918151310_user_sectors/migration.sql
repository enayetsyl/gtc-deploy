-- DropForeignKey
ALTER TABLE `UserSector` DROP FOREIGN KEY `UserSector_sector_fkey`;

-- DropForeignKey
ALTER TABLE `UserSector` DROP FOREIGN KEY `UserSector_user_fkey`;

-- AlterTable
ALTER TABLE `UserSector` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE `UserSector` ADD CONSTRAINT `UserSector_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSector` ADD CONSTRAINT `UserSector_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `Sector`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex (MariaDB compatible)
ALTER TABLE `UserSector` DROP INDEX `UserSector_sectorId_index`, ADD INDEX `UserSector_sectorId_idx` (`sectorId`);

-- RenameIndex (MariaDB compatible) 
ALTER TABLE `UserSector` DROP INDEX `UserSector_userId_sectorId_unique`, ADD UNIQUE INDEX `UserSector_userId_sectorId_key` (`userId`, `sectorId`);
