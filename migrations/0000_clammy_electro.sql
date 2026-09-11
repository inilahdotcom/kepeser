CREATE TABLE `ticket_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` integer NOT NULL,
	`actor_id` integer,
	`type` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ticket_events_ticket` ON `ticket_events` (`ticket_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_token` text NOT NULL,
	`source` text DEFAULT 'issue' NOT NULL,
	`reporter_name` text NOT NULL,
	`reporter_division` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`assignee_id` integer,
	`created_by` integer,
	`reject_reason` text,
	`reopen_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`approved_at` integer,
	`assigned_at` integer,
	`started_at` integer,
	`done_at` integer,
	`due_at` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_public_token` ON `tickets` (`public_token`);--> statement-breakpoint
CREATE INDEX `tickets_status` ON `tickets` (`status`);--> statement-breakpoint
CREATE INDEX `tickets_assignee` ON `tickets` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `tickets_created_at` ON `tickets` (`created_at`);--> statement-breakpoint
CREATE INDEX `tickets_done_at` ON `tickets` (`done_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`job_title` text DEFAULT 'support' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email` ON `users` (`email`);