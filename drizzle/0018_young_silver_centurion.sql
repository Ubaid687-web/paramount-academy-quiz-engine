CREATE TABLE `generationStyleAnchorExamples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`board` varchar(50) NOT NULL DEFAULT 'FBISE',
	`grade` varchar(20) NOT NULL,
	`subject` varchar(100) NOT NULL,
	`questionId` int NOT NULL,
	`approvedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generationStyleAnchorExamples_id` PRIMARY KEY(`id`),
	CONSTRAINT `generationStyleAnchorExamples_questionId_unique` UNIQUE(`questionId`)
);
