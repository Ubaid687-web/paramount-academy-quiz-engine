CREATE TABLE `programmeCatalogues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`board` varchar(50) NOT NULL,
	`grade` varchar(20) NOT NULL,
	`subject` varchar(100) NOT NULL,
	`teacherLabel` varchar(255) NOT NULL,
	`status` enum('intake_only','ready') NOT NULL DEFAULT 'intake_only',
	`createdBy` int NOT NULL,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programmeCatalogues_id` PRIMARY KEY(`id`),
	CONSTRAINT `programmeCatalogues_board_grade_subject_unique` UNIQUE(`board`,`grade`,`subject`)
);
--> statement-breakpoint
ALTER TABLE `assessmentPatternSources` MODIFY COLUMN `grade` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `assessmentPatternSources` MODIFY COLUMN `subject` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `curriculumSets` MODIFY COLUMN `grade` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `curriculumSets` MODIFY COLUMN `subject` varchar(100) NOT NULL;