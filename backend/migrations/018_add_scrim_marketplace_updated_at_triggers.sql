DROP TRIGGER IF EXISTS trigger_set_updated_at_scrim_posts ON scrim_posts;
CREATE TRIGGER trigger_set_updated_at_scrim_posts
BEFORE UPDATE ON scrim_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_scrim_applications ON scrim_applications;
CREATE TRIGGER trigger_set_updated_at_scrim_applications
BEFORE UPDATE ON scrim_applications
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
