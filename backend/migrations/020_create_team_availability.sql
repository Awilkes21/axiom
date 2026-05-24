CREATE TABLE IF NOT EXISTS team_availability (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    slot_start TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (team_id, account_id, slot_start)
);

CREATE INDEX IF NOT EXISTS idx_team_availability_team_slot
    ON team_availability (team_id, slot_start);

DROP TRIGGER IF EXISTS set_team_availability_updated_at ON team_availability;
CREATE TRIGGER set_team_availability_updated_at
BEFORE UPDATE ON team_availability
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
