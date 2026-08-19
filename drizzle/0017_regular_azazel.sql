CREATE TABLE `generationProviderSettings` (
	`id` int NOT NULL,
	`geminiFallbackEnabled` int NOT NULL DEFAULT 0,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generationProviderSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `generationProvider` varchar(64) DEFAULT 'managed_llm' NOT NULL;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `fallbackUsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `primaryFailureType` varchar(80);--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `managedRetryAttempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `geminiRetryAttempts` int DEFAULT 0 NOT NULL;