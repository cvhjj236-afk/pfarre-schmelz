CREATE TABLE `revisions` (
	`version` integer PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL,
	`author` text NOT NULL
);
