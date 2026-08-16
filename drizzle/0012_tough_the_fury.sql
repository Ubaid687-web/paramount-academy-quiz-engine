ALTER TABLE `generationJobs` ADD `retryAttempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `sourceCitation` longtext;