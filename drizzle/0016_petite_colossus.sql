CREATE TABLE `teacherProvisionRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`addedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teacherProvisionRules_id` PRIMARY KEY(`id`),
	CONSTRAINT `teacherProvisionRules_email_unique` UNIQUE(`email`)
);
