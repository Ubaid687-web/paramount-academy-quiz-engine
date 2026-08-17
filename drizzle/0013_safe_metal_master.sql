CREATE TABLE `generationCircuitStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceKey` varchar(100) NOT NULL,
	`state` enum('closed','open') NOT NULL DEFAULT 'closed',
	`failureType` varchar(80),
	`openUntil` timestamp,
	`lastFailureAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generationCircuitStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `generationCircuitStates_serviceKey_unique` UNIQUE(`serviceKey`)
);
--> statement-breakpoint
CREATE TABLE `generationResponseCaches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`requestFingerprint` varchar(64) NOT NULL,
	`generationMode` enum('mcq','short','long') NOT NULL,
	`payload` longtext NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`hitCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generationResponseCaches_id` PRIMARY KEY(`id`),
	CONSTRAINT `generationResponseCaches_user_request_unique` UNIQUE(`userId`,`requestFingerprint`)
);
--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `requestFingerprint` varchar(64);--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `cacheHit` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `promptSourceChars` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `promptInputChars` int DEFAULT 0 NOT NULL;