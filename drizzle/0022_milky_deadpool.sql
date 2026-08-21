ALTER TABLE `assessmentPatternSources` ADD `timelineOrder` int;--> statement-breakpoint
ALTER TABLE `assessmentPatternSources` ADD `timelineLabel` varchar(255);--> statement-breakpoint
ALTER TABLE `assessmentPatternSources` ADD CONSTRAINT `assessmentPatternSources_programme_timeline_unique` UNIQUE(`board`,`grade`,`subject`,`timelineOrder`);