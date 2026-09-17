-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT;

-- Backfill existing test users in place; preserve IDs, relations and any set name.
UPDATE "User" AS u
SET "displayName" = names."displayName"
FROM (VALUES
  ('alpha@test.com', 'Alpha'),
  ('bravo@test.com', 'Bravo'),
  ('charlie@test.com', 'Charlie')
) AS names(email, "displayName")
WHERE u.email = names.email
  AND u."displayName" IS NULL;
