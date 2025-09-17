-- CreateTable
CREATE TABLE `PointOnboarding` (
    `id` VARCHAR(191) NOT NULL,
    `sectorId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `vatOrTaxNumber` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `signaturePath` VARCHAR(191) NULL,
    `includeServices` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'DECLINED', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
    `onboardingToken` VARCHAR(191) NOT NULL,
    `registrationToken` VARCHAR(191) NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `gtcPointId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `submittedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PointOnboarding_onboardingToken_key`(`onboardingToken`),
    UNIQUE INDEX `PointOnboarding_registrationToken_key`(`registrationToken`),
    INDEX `PointOnboarding_sectorId_status_createdAt_idx`(`sectorId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PointOnboardingService` (
    `id` VARCHAR(191) NOT NULL,
    `onboardingId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PointOnboardingService_onboardingId_serviceId_key`(`onboardingId`, `serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PointOnboarding` ADD CONSTRAINT `PointOnboarding_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `Sector`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PointOnboarding` ADD CONSTRAINT `PointOnboarding_approvedByUserId_fkey` FOREIGN KEY (`approvedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PointOnboarding` ADD CONSTRAINT `PointOnboarding_gtcPointId_fkey` FOREIGN KEY (`gtcPointId`) REFERENCES `GtcPoint`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PointOnboardingService` ADD CONSTRAINT `PointOnboardingService_onboardingId_fkey` FOREIGN KEY (`onboardingId`) REFERENCES `PointOnboarding`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PointOnboardingService` ADD CONSTRAINT `PointOnboardingService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
