-- Ditulis tangan, BUKAN digenerate.
--
-- drizzle-kit menangani `active` -> `status` dengan membangun ulang tabel dan
-- INSERT … SELECT berdasarkan NAMA kolom. Karena namanya berbeda, pemetaannya
-- tidak ikut: semua akun jatuh ke default dan seluruh tim tidak bisa login.
--
-- Tiga pernyataan di bawah memetakan nilainya secara eksplisit.
ALTER TABLE `users` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
UPDATE `users` SET `status` = CASE `active` WHEN 1 THEN 'active' ELSE 'disabled' END;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `active`;
