CREATE TABLE `quizCollaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quizId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('viewer','editor','admin') NOT NULL DEFAULT 'viewer',
	`addedBy` int NOT NULL,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizCollaborators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizShares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quizId` int NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`createdBy` int NOT NULL,
	`expiresAt` timestamp,
	`maxUses` int,
	`currentUses` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizShares_id` PRIMARY KEY(`id`),
	CONSTRAINT `quizShares_shareToken_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE TABLE `reviewHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`reviewDate` timestamp NOT NULL DEFAULT (now()),
	`result` enum('again','hard','good','easy') NOT NULL,
	`difficulty` int NOT NULL,
	`timeSpent` int,
	CONSTRAINT `reviewHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`quizId` int NOT NULL,
	`nextReviewDate` timestamp NOT NULL,
	`interval` int NOT NULL DEFAULT 1,
	`easeFactor` int NOT NULL DEFAULT 2500,
	`repetitions` int NOT NULL DEFAULT 0,
	`lastReviewDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviewSchedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sharedQuizAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shareTokenId` int NOT NULL,
	`userId` int,
	`attemptId` int NOT NULL,
	`accessedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sharedQuizAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userQuestionStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`correctCount` int NOT NULL DEFAULT 0,
	`incorrectCount` int NOT NULL DEFAULT 0,
	`lastReviewDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userQuestionStats_id` PRIMARY KEY(`id`)
);
