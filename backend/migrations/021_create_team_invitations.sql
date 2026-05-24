CREATE TABLE IF NOT EXISTS team_invitations (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    invited_account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    invited_by_account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role team_role NOT NULL DEFAULT 'player',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CHECK (status IN ('pending', 'accepted', 'declined', 'canceled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS team_invitations_pending_unique
ON team_invitations (team_id, invited_account_id)
WHERE status = 'pending';

DROP TRIGGER IF EXISTS trigger_set_updated_at_team_invitations ON team_invitations;
CREATE TRIGGER trigger_set_updated_at_team_invitations
BEFORE UPDATE ON team_invitations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
