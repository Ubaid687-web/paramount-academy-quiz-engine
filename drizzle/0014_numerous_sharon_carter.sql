CREATE TABLE `ocrExtractionJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`nextPage` int NOT NULL DEFAULT 1,
	`totalPages` int NOT NULL,
	`attemptCount` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ocrExtractionJobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `ocrExtractionJobs_sourceId_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `ocrSchedulerStates` (
	`id` int NOT NULL,
	`taskUid` varchar(65) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ocrSchedulerStates_id` PRIMARY KEY(`id`)
);
