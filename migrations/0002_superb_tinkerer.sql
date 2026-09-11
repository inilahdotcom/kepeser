ALTER TABLE `tickets` ADD `public_hidden` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `tickets_board` ON `tickets` (`public_hidden`,`status`);