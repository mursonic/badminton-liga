DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `seasons` DROP INDEX `seasons_year_unique`;--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `played_at` bigint;