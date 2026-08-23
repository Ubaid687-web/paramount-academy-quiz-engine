CREATE TABLE `curriculumUploadChunkReceipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` varchar(36) NOT NULL,
	`chunkIndex` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`byteLength` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`status` enum('pending','committed') NOT NULL DEFAULT 'pending',
	`leaseExpiresAt` timestamp NOT NULL,
	`committedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculumUploadChunkReceipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `curriculumUploadChunkReceipts_upload_chunk_unique` UNIQUE(`uploadId`,`chunkIndex`)
);
--> statement-breakpoint
CREATE TABLE `curriculumUploadSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`curriculumSetId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int NOT NULL,
	`status` enum('active','finalizing','completed','retired') NOT NULL DEFAULT 'active',
	`receivedBytes` int NOT NULL DEFAULT 0,
	`nextChunkIndex` int NOT NULL DEFAULT 0,
	`revision` int NOT NULL DEFAULT 0,
	`sourceId` int,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculumUploadSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `curriculumUploadSessions_uploadId_unique` UNIQUE(`uploadId`)
);
