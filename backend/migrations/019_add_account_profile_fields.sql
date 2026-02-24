DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'accounts'
          AND column_name = 'bio'
    ) THEN
        ALTER TABLE accounts
        ADD COLUMN bio TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'accounts'
          AND column_name = 'timezone'
    ) THEN
        ALTER TABLE accounts
        ADD COLUMN timezone VARCHAR(64);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'accounts'
          AND column_name = 'discord_handle'
    ) THEN
        ALTER TABLE accounts
        ADD COLUMN discord_handle VARCHAR(64);
    END IF;
END $$;
