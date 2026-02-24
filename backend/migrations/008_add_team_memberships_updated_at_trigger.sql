DROP TRIGGER IF EXISTS trigger_set_updated_at_team_memberships ON team_memberships;

CREATE TRIGGER trigger_set_updated_at_team_memberships
BEFORE UPDATE ON team_memberships
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
