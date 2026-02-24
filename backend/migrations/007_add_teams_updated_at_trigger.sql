DROP TRIGGER IF EXISTS trigger_set_updated_at_teams ON teams;

CREATE TRIGGER trigger_set_updated_at_teams
BEFORE UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
