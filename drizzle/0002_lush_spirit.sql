CREATE TABLE `generationJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`contentText` text NOT NULL,
	`numQuestions` int NOT NULL,
	`difficulty` varchar(50) NOT NULL DEFAULT 'balanced',
	`generatedQuizId` int,
	`errorMessage` text,
	`progress` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `generationJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `quizzes` ADD `isAiGenerated` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `createdBy` int;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `sourceContent` text;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `generationMetadata` text;