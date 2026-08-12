CREATE TABLE `curriculumChapterSegments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chapterId` int NOT NULL,
	`sequence` int NOT NULL,
	`label` varchar(100) NOT NULL,
	`startPage` int,
	`endPage` int,
	`startOffset` int,
	`endOffset` int,
	`contentText` longtext NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculumChapterSegments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curriculumChapters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`curriculumSetId` int NOT NULL,
	`sourceId` int NOT NULL,
	`sequence` int NOT NULL,
	`code` varchar(50),
	`title` varchar(255) NOT NULL,
	`blockKey` varchar(100),
	`partKey` varchar(100),
	`startPage` int,
	`endPage` int,
	`contentText` longtext NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculumChapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curriculumScopeTemplateChapters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scopeTemplateId` int NOT NULL,
	`chapterId` int NOT NULL,
	`sequence` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `curriculumScopeTemplateChapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curriculumScopeTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`curriculumSetId` int NOT NULL,
	`scopeKind` enum('half_syllabus','block') NOT NULL,
	`label` varchar(255) NOT NULL,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculumScopeTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curriculumSets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grade` enum('10') NOT NULL DEFAULT '10',
	`subject` enum('physics','chemistry','computer_science') NOT NULL,
	`board` varchar(50) NOT NULL DEFAULT 'FBISE',
	`label` varchar(255) NOT NULL,
	`editionLabel` varchar(255),
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`replacesSetId` int,
	`createdBy` int NOT NULL,
	`activatedAt` timestamp,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculumSets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curriculumSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`curriculumSetId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` text NOT NULL,
	`originalFileName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`contentHash` varchar(64),
	`extractionStatus` enum('pending','extracted','needs_review','failed') NOT NULL DEFAULT 'pending',
	`pageCount` int,
	`extractedText` longtext,
	`extractionError` text,
	`uploadedBy` int NOT NULL,
	`extractedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculumSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `curriculumSetId` int;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `scopeTemplateId` int;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `scopeType` enum('ad_hoc','single_chapter','half_chapter','multiple_chapters','half_syllabus','block') DEFAULT 'ad_hoc' NOT NULL;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `selectedChapterIds` text;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `selectedSegmentIds` text;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `sourceSnapshot` longtext;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `curriculumSetId` int;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `scopeSnapshot` longtext;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `difficultyProfile` varchar(50);--> statement-breakpoint
ALTER TABLE `quizzes` ADD `publicationStatus` enum('draft','in_review','published','archived') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `publishedAt` timestamp;