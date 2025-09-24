CREATE TRIGGER trigger_set_updated_at_matches
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();