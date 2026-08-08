BEGIN;

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

COMMIT;
