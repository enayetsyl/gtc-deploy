-- Migration: Rename convention enum values and migrate data
-- Strategy:
-- 1) Expand the enum to include both old and new labels so the ALTER is safe
-- 2) Update existing rows mapping old values to new values
-- 3) Restrict the enum to the final set

/*
Run on staging first. Backup before running on production.

Example backup command (adjust for your environment):
mysqldump --single-transaction --routines --triggers --events -u "$DB_USER" -p -h "$DB_HOST" "$DB_NAME" > db-backup-before-convention-enum.sql

Then run this migration SQL against the database using your preferred client.
*/

-- Step 1: widen enum to accept old and new values
ALTER TABLE `Convention`
  MODIFY COLUMN `status` ENUM('NEW','UPLOADED','APPROVED','PENDING','ACCEPTED','DECLINED') NOT NULL DEFAULT 'PENDING';

-- Step 2: map existing rows to new canonical values
UPDATE `Convention` SET status = 'PENDING' WHERE status IN ('NEW','UPLOADED');
UPDATE `Convention` SET status = 'ACCEPTED' WHERE status = 'APPROVED';

-- Step 3: lock down enum to final set
ALTER TABLE `Convention`
  MODIFY COLUMN `status` ENUM('PENDING','ACCEPTED','DECLINED') NOT NULL DEFAULT 'PENDING';

-- End migration
