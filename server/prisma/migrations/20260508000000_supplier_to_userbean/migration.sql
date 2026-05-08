-- Move `supplier` from Bean to UserBean.
-- Supplier is per-acquisition (where this user bought this bean), not bean
-- identity. Two users may have the same bean from different sellers.

-- 1. Add the new column on UserBean.
ALTER TABLE "UserBean" ADD COLUMN "supplier" TEXT;

-- 2. Backfill: copy each Bean.supplier into the UserBean rows that link to
--    that bean. If multiple users link the same bean, they all inherit the
--    same supplier value initially; they can update it on their own row.
UPDATE "UserBean" ub
SET "supplier" = b."supplier"
FROM "Bean" b
WHERE ub."beanId" = b."id" AND b."supplier" IS NOT NULL;

-- 3. Drop the old column on Bean.
ALTER TABLE "Bean" DROP COLUMN "supplier";
