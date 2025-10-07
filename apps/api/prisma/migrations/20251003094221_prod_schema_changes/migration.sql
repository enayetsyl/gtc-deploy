-- RenameIndex
-- MariaDB doesn't support RENAME INDEX in all versions. Replace by dropping the old unique index and recreating it with the desired name.
-- Drop foreign key constraints that reference indexes used by the unique index.
-- This is necessary because some MySQL/MariaDB versions require dropping FK constraints
-- before removing an index that they depend on.
ALTER TABLE `GtcPointSector` DROP FOREIGN KEY `GtcPointSector_gtcPointId_fkey`;
ALTER TABLE `GtcPointSector` DROP FOREIGN KEY `GtcPointSector_sectorId_fkey`;

-- Now drop the old unique index and recreate it with the new name
ALTER TABLE `GtcPointSector` DROP INDEX `GtcPointSector_gtcPointId_sectorId_unique`;
ALTER TABLE `GtcPointSector` ADD UNIQUE INDEX `GtcPointSector_gtcPointId_sectorId_key` (`gtcPointId`, `sectorId`);

-- Recreate the foreign key constraints
ALTER TABLE `GtcPointSector` ADD CONSTRAINT `GtcPointSector_gtcPointId_fkey` FOREIGN KEY (`gtcPointId`) REFERENCES `GtcPoint` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `GtcPointSector` ADD CONSTRAINT `GtcPointSector_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `Sector` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
