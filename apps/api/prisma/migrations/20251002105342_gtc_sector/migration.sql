-- Create and configure GtcPointSector join table with proper types and constraints
-- This migration creates the table and defines foreign keys in a single statement to avoid cross-migration ordering issues.

CREATE TABLE IF NOT EXISTS `GtcPointSector` (
	`id` varchar(191) NOT NULL,
	`gtcPointId` varchar(191) NOT NULL,
	`sectorId` varchar(191) NOT NULL,
	`createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	PRIMARY KEY (`id`),
	KEY `GtcPointSector_sectorId_idx` (`sectorId`),
	CONSTRAINT `GtcPointSector_gtcPointId_fkey` FOREIGN KEY (`gtcPointId`) REFERENCES `GtcPoint` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT `GtcPointSector_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `Sector` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT `GtcPointSector_gtcPointId_sectorId_unique` UNIQUE (`gtcPointId`, `sectorId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
