-- RenameIndex
-- MariaDB doesn't support RENAME INDEX in all versions. Replace by dropping the old unique index and recreating it with the desired name.
ALTER TABLE `GtcPointSector` DROP INDEX `GtcPointSector_gtcPointId_sectorId_unique`;
ALTER TABLE `GtcPointSector` ADD UNIQUE INDEX `GtcPointSector_gtcPointId_sectorId_key` (`gtcPointId`, `sectorId`);
