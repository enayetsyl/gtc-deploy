-- Create shadow database used by Prisma migrate
CREATE DATABASE IF NOT EXISTS `gtc_shadow`;
-- Ensure app user has privileges on gtc_local and gtc_shadow
GRANT ALL PRIVILEGES ON `gtc_local`.* TO 'app'@'%';
GRANT ALL PRIVILEGES ON `gtc_shadow`.* TO 'app'@'%';
FLUSH PRIVILEGES;
