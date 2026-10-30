ALTER TABLE "Product"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'CAD',
ADD COLUMN "rentalDepositUnitAmount" DECIMAL(10,2);

ALTER TABLE "Order"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'CAD',
ADD COLUMN "subtotal" DECIMAL(10,2),
ADD COLUMN "rentalDays" INTEGER,
ADD COLUMN "rentalDepositAmount" DECIMAL(10,2);

-- Existing SALE orders:
-- subtotal = unit price × quantity.
UPDATE "Order"
SET "subtotal" = "unitPrice" * "quantity"
WHERE "transactionType" = 'SALE';

-- Existing RENT orders:
-- rental dates use the existing [from, to) calendar-day contract.
UPDATE "Order"
SET
    "rentalDays" = GREATEST(
        1,
        CEIL(
            EXTRACT(
                EPOCH FROM ("requestedTo" - "requestedFrom")
            ) / 86400
        )::INTEGER
    ),
    "subtotal" =
        "unitPrice"
        * "quantity"
        * GREATEST(
            1,
            CEIL(
                EXTRACT(
                    EPOCH FROM ("requestedTo" - "requestedFrom")
                ) / 86400
            )::INTEGER
        ),
    "rentalDepositAmount" = 0
WHERE
    "transactionType" = 'RENT'
    AND "requestedFrom" IS NOT NULL
    AND "requestedTo" IS NOT NULL;

-- Defensive fallback for any historical malformed rows.
UPDATE "Order"
SET "subtotal" = "unitPrice" * "quantity"
WHERE "subtotal" IS NULL;

ALTER TABLE "Order"
ALTER COLUMN "subtotal" SET NOT NULL;