-- Add UserSector join table for many-to-many between users and sectors
CREATE TABLE `UserSector` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sectorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserSector_userId_sectorId_unique` (`userId`, `sectorId`),
  KEY `UserSector_sectorId_index` (`sectorId`),
  CONSTRAINT `UserSector_user_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserSector_sector_fkey` FOREIGN KEY (`sectorId`) REFERENCES `Sector`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
