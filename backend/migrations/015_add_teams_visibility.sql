DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'teams'
          AND column_name = 'visibility'
    ) THEN
        ALTER TABLE teams
        ADD COLUMN visibility VARCHAR(10) NOT NULL DEFAULT 'private';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'teams_visibility_check'
    ) THEN
        ALTER TABLE teams
        ADD CONSTRAINT teams_visibility_check
        CHECK (visibility IN ('public', 'private'));
    END IF;
END $$;
