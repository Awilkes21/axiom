-- Enforce one membership row per account/team.
-- Keep the highest-privilege role if duplicates already exist.
WITH ranked_memberships AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY account_id, team_id
            ORDER BY
                CASE role
                    WHEN 'admin' THEN 5
                    WHEN 'manager' THEN 4
                    WHEN 'coach' THEN 3
                    WHEN 'sub' THEN 2
                    WHEN 'player' THEN 1
                    ELSE 0
                END DESC,
                id ASC
        ) AS rn
    FROM team_memberships
)
DELETE FROM team_memberships tm
USING ranked_memberships rm
WHERE tm.id = rm.id
  AND rm.rn > 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'team_memberships_account_team_unique'
    ) THEN
        ALTER TABLE team_memberships
        ADD CONSTRAINT team_memberships_account_team_unique UNIQUE (account_id, team_id);
    END IF;
END $$;
