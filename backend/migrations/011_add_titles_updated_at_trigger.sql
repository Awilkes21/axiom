CREATE TRIGGER trigger_set_updated_at_titles
BEFORE UPDATE ON titles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();