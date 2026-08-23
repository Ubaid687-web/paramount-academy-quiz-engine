CREATE TABLE `appSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionIdHash` varchar(64) NOT NULL,
	`openId` varchar(64) NOT NULL,
	`appId` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `appSessions_sessionIdHash_unique` UNIQUE(`sessionIdHash`)
);
