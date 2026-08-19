ALTER TABLE `generationJobs` ADD `providerInputTokens` int;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `providerOutputTokens` int;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `providerCachedTokens` int;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `providerTotalTokens` int;--> statement-breakpoint
ALTER TABLE `generationJobs` ADD `generationMode` enum('mcq','short','long');