BEGIN;

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS appointment_id integer;

WITH duplicated_sales AS (
  SELECT
    id,
    appointment_id,
    ROW_NUMBER() OVER (
      PARTITION BY appointment_id
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS row_num
  FROM sales
  WHERE appointment_id IS NOT NULL
)
UPDATE sales AS s
SET appointment_id = NULL
FROM duplicated_sales AS d
WHERE s.id = d.id
  AND d.row_num > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_appointment_id_unique'
      AND conrelid = 'sales'::regclass
  ) THEN
    ALTER TABLE sales
    ADD CONSTRAINT sales_appointment_id_unique UNIQUE (appointment_id);
  END IF;
END $$;

COMMIT;
