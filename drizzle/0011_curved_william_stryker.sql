CREATE TABLE `curriculumSourcePageReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`pageNumber` int NOT NULL,
	`textCharacters` int NOT NULL,
	`meaningfulWords` int NOT NULL,
	`qualityScore` int NOT NULL,
	`reviewStatus` enum('clear','needs_review','reviewed') NOT NULL,
	`reviewReasons` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculumSourcePageReviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `curriculumSourcePageReviews_source_page_unique` UNIQUE(`sourceId`,`pageNumber`)
);
