-- RenameIndex safely: drop foreign key constraints that rely on the index, drop the index, recreate the unique index with new name, then recreate the foreign keys.
-- NOTE: This migration runs against the shadow DB during `prisma migrate dev`. If your real DB differs, adjust accordingly.

-- drop foreign keys that reference these columns (names taken from schema/migrations)
ALTER TABLE `GtcPointSector` DROP FOREIGN KEY `GtcPointSector_gtcPointId_fkey`;
ALTER TABLE `GtcPointSector` DROP FOREIGN KEY `GtcPointSector_sectorId_fkey`;

-- drop the old unique index
DROP INDEX `GtcPointSector_gtcPointId_sectorId_unique` ON `GtcPointSector`;

-- create the new unique index with the desired name
ALTER TABLE `GtcPointSector` ADD UNIQUE INDEX `GtcPointSector_gtcPointId_sectorId_key` (`gtcPointId`, `sectorId`);

-- recreate the foreign keys
ALTER TABLE `GtcPointSector` ADD CONSTRAINT `GtcPointSector_gtcPointId_fkey` FOREIGN KEY (`gtcPointId`) REFERENCES `GtcPoint` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `GtcPointSector` ADD CONSTRAINT `GtcPointSector_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `Sector` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
