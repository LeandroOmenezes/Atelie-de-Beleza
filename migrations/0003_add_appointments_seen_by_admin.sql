BEGIN;

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS seen_by_admin boolean DEFAULT false NOT NULL;

COMMIT;