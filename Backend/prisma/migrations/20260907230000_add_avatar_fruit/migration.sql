-- Chosen fruit avatar per employee (nullable; null falls back to a deterministic default).
ALTER TABLE "Employee" ADD COLUMN "avatarFruit" TEXT;
