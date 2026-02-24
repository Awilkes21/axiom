DROP TRIGGER IF EXISTS trigger_set_updated_at_scrims ON scrims;

CREATE TRIGGER trigger_set_updated_at_scrims
BEFORE UPDATE ON scrims
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
