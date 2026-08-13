CREATE TABLE `assessmentPatternSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grade` enum('10') NOT NULL DEFAULT '10',
	`subject` enum('physics','chemistry','computer_science') NOT NULL,
	`sourceKind` enum('model_paper','past_paper') NOT NULL,
	`academicYear` varchar(20),
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` text NOT NULL,
	`originalFileName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`extractedText` longtext,
	`extractionStatus` enum('pending','extracted','needs_review','failed') NOT NULL DEFAULT 'pending',
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`uploadedBy` int NOT NULL,
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assessmentPatternSources_id` PRIMARY KEY(`id`)
);
