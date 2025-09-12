-- CreateTable
CREATE TABLE `Convention` (
    `id` VARCHAR(191) NOT NULL,
    `gtcPointId` VARCHAR(191) NOT NULL,
    `sectorId` VARCHAR(191) NOT NULL,
    `status` ENUM('NEW', 'UPLOADED', 'APPROVED', 'DECLINED') NOT NULL DEFAULT 'NEW',
    `internalSalesRep` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Convention_gtcPointId_status_createdAt_idx`(`gtcPointId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConventionDocument` (
    `id` VARCHAR(191) NOT NULL,
    `conventionId` VARCHAR(191) NOT NULL,
    `kind` ENUM('PREFILL', 'SIGNED', 'OTHER') NOT NULL DEFAULT 'SIGNED',
    `fileName` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `mime` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `checksum` VARCHAR(191) NOT NULL,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ConventionDocument_conventionId_createdAt_idx`(`conventionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Convention` ADD CONSTRAINT `Convention_gtcPointId_fkey` FOREIGN KEY (`gtcPointId`) REFERENCES `GtcPoint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Convention` ADD CONSTRAINT `Convention_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `Sector`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConventionDocument` ADD CONSTRAINT `ConventionDocument_conventionId_fkey` FOREIGN KEY (`conventionId`) REFERENCES `Convention`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConventionDocument` ADD CONSTRAINT `ConventionDocument_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
