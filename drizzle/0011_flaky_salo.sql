CREATE TABLE `programmeEvidenceRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programmeId` int NOT NULL,
	`evidenceKind` enum('analysis_reference','practical_assessment') NOT NULL,
	`academicYear` varchar(20),
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` text NOT NULL,
	`originalFileName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`contentHash` varchar(64) NOT NULL,
	`extractedText` longtext,
	`extractionStatus` enum('pending','extracted','needs_review','failed') NOT NULL DEFAULT 'pending',
	`status` enum('draft','reviewed','archived') NOT NULL DEFAULT 'draft',
	`evidenceNotes` longtext,
	`uploadedBy` int NOT NULL,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programmeEvidenceRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `programmeEvidenceRecords_programme_hash_unique` UNIQUE(`programmeId`,`contentHash`)
);
--> statement-breakpoint
ALTER TABLE `assessmentPatternSources` ADD `contentHash` varchar(64);