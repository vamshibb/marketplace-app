CREATE TYPE "RentalDisputeResolution" AS ENUM (
    'RELEASE_DEPOSIT',
    'CAPTURE_DEPOSIT'
);

ALTER TABLE "RentalDispute"
ADD COLUMN "resolution" "RentalDisputeResolution",
ADD COLUMN "resolvedAt" TIMESTAMP(3);