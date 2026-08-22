ALTER TABLE `assessmentPatternSources` ADD `studentLibraryStatus` enum('hidden','published') DEFAULT 'hidden' NOT NULL;--> statement-breakpoint
ALTER TABLE `assessmentPatternSources` ADD `studentPublishedBy` int;--> statement-breakpoint
ALTER TABLE `assessmentPatternSources` ADD `studentPublishedAt` timestamp;