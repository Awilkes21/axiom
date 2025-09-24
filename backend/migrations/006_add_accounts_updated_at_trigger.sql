CREATE TRIGGER trigger_set_updated_at_accounts
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();