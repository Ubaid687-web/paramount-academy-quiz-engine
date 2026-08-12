ALTER TABLE `generationJobs` MODIFY COLUMN `contentText` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` MODIFY COLUMN `sourceContent` longtext;