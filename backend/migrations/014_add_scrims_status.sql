DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'scrims'
          AND column_name = 'status'
    ) THEN
        ALTER TABLE scrims
        ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'scrims_status_check'
    ) THEN
        ALTER TABLE scrims
        ADD CONSTRAINT scrims_status_check
        CHECK (status IN ('pending', 'confirmed', 'canceled'));
    END IF;
END $$;
