CREATE TABLE `curriculumUploadClaims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`curriculumSetId` int NOT NULL,
	`status` enum('open','processing','completed') NOT NULL DEFAULT 'open',
	`sourceId` int,
	`expiresAt` timestamp NOT NULL,
	`claimedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculumUploadClaims_id` PRIMARY KEY(`id`),
	CONSTRAINT `curriculumUploadClaims_uploadId_unique` UNIQUE(`uploadId`)
);
