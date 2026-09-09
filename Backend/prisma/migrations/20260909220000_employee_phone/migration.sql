-- Contact number on the worker record (works before they have a login).
ALTER TABLE "Employee" ADD COLUMN "phone" TEXT;

-- seed it from linked accounts that already have one
UPDATE "Employee" e
SET "phone" = u."phone"
FROM "User" u
WHERE u."employeeId" = e."id" AND u."phone" IS NOT NULL;
