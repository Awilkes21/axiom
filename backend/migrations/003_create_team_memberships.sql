-- CHANGE THIS ONCE STABLE
--DROP TYPE IF EXISTS team_role CASCADE;

--CREATE TYPE team_role AS ENUM ('player', 'sub', 'coach', 'manager', 'admin'); --analyst?

CREATE TABLE IF NOT EXISTS team_memberships (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role team_role NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (account_id, team_id, role)
);