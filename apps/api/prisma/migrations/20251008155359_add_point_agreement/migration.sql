-- CreateTable
CREATE TABLE `PointAgreement` (
    `id` VARCHAR(191) NOT NULL,
    `onboardingId` VARCHAR(191) NOT NULL,
    `sectorId` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `taxCodeOrVat` VARCHAR(191) NULL,
    `registeredCity` VARCHAR(191) NULL,
    `registeredProvince` VARCHAR(191) NULL,
    `registeredAddress` VARCHAR(191) NULL,
    `legalRepresentative` VARCHAR(191) NULL,
    `contactSurname` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `contactRole` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `protocolNo` VARCHAR(191) NULL,
    `conventionNo` VARCHAR(191) NULL,
    `placeSigned` VARCHAR(191) NULL,
    `dateSigned` DATETIME(3) NULL,
    `signaturePath` VARCHAR(191) NULL,
    `signatureUploadthingKey` VARCHAR(191) NULL,
    `agreedToArticles` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PointAgreement_onboardingId_key`(`onboardingId`),
    INDEX `PointAgreement_sectorId_createdAt_idx`(`sectorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PointAgreementService` (
    `id` VARCHAR(191) NOT NULL,
    `agreementId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PointAgreementService_serviceId_idx`(`serviceId`),
    UNIQUE INDEX `PointAgreementService_agreementId_serviceId_key`(`agreementId`, `serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PointAgreement` ADD CONSTRAINT `PointAgreement_onboardingId_fkey` FOREIGN KEY (`onboardingId`) REFERENCES `PointOnboarding`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PointAgreement` ADD CONSTRAINT `PointAgreement_sectorId_fkey` FOREIGN KEY (`sectorId`) REFERENCES `Sector`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PointAgreementService` ADD CONSTRAINT `PointAgreementService_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `PointAgreement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PointAgreementService` ADD CONSTRAINT `PointAgreementService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
