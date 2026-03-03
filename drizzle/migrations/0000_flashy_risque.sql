CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `match_sets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`match_id` int NOT NULL,
	`set_number` int NOT NULL,
	`score_team1` int NOT NULL,
	`score_team2` int NOT NULL,
	CONSTRAINT `match_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`season_id` int NOT NULL,
	`type` enum('singles','doubles','mixed') NOT NULL,
	`player1_id` int NOT NULL,
	`player2_id` int,
	`player3_id` int NOT NULL,
	`player4_id` int,
	`winning_side` int NOT NULL,
	`played_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`gender` enum('male','female','other') NOT NULL DEFAULT 'other',
	`created_at` bigint NOT NULL,
	CONSTRAINT `players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT false,
	`created_at` bigint NOT NULL,
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`),
	CONSTRAINT `seasons_year_unique` UNIQUE(`year`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
