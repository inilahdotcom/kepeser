ALTER TABLE `tickets` ADD `archived_at` integer;--> statement-breakpoint
CREATE INDEX `tickets_archived_at` ON `tickets` (`archived_at`);