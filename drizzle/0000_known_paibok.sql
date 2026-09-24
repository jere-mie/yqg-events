CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`content_markdown` text,
	`start_datetime` text NOT NULL,
	`end_datetime` text,
	`effective_end` text NOT NULL,
	`all_day` integer DEFAULT false NOT NULL,
	`venue_name` text,
	`address` text,
	`city` text NOT NULL,
	`region` text DEFAULT 'Windsor-Essex' NOT NULL,
	`postal_code` text,
	`latitude` real,
	`longitude` real,
	`categories` text NOT NULL,
	`tags` text NOT NULL,
	`is_free` integer,
	`is_family_friendly` integer,
	`source_url` text NOT NULL,
	`source_name` text,
	`event_url` text,
	`image_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`dedupe_key` text NOT NULL,
	`source_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_verified_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_slug` ON `events` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_identity` ON `events` (`dedupe_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `event_source_occurrence` ON `events` (`source_key`);--> statement-breakpoint
CREATE INDEX `event_status_date` ON `events` (`status`,`start_datetime`);--> statement-breakpoint
CREATE TABLE `oauth_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`redirect_uris` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_codes` (
	`hash` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`challenge` text NOT NULL,
	`resource` text NOT NULL,
	`scope` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_tokens` (
	`hash` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`kind` text NOT NULL,
	`family` text NOT NULL,
	`scope` text NOT NULL,
	`resource` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `token_family` ON `oauth_tokens` (`family`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
