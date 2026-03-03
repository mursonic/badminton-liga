CREATE TABLE `match_sets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`setNumber` int NOT NULL,
	`team1Score` int NOT NULL,
	`team2Score` int NOT NULL,
	CONSTRAINT `match_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`matchType` enum('singles','doubles','mixed') NOT NULL,
	`team1Player1Id` int NOT NULL,
	`team1Player2Id` int,
	`team2Player1Id` int NOT NULL,
	`team2Player2Id` int,
	`winner` enum('team1','team2') NOT NULL,
	`team1TotalPoints` int NOT NULL DEFAULT 0,
	`team2TotalPoints` int NOT NULL DEFAULT 0,
	`team1Sets` int NOT NULL DEFAULT 0,
	`team2Sets` int NOT NULL DEFAULT 0,
	`playedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`nickname` varchar(64),
	`gender` enum('male','female','other') NOT NULL DEFAULT 'other',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`),
	CONSTRAINT `seasons_year_unique` UNIQUE(`year`)
);
