-- Seed match results for confirmed scrims.
INSERT INTO matches (scrim_id, map_name, team_score, opponent_score)
SELECT
    s.id,
    'Ascent',
    13,
    10
FROM scrims s
WHERE s.scheduled_at = TIMESTAMP '2026-03-03 20:30:00'
  AND s.status = 'confirmed'
  AND NOT EXISTS (
    SELECT 1
    FROM matches m
    WHERE m.scrim_id = s.id
      AND m.map_name = 'Ascent'
  );

INSERT INTO matches (scrim_id, map_name, team_score, opponent_score)
SELECT
    s.id,
    'Bind',
    8,
    13
FROM scrims s
WHERE s.scheduled_at = TIMESTAMP '2026-03-03 20:30:00'
  AND s.status = 'confirmed'
  AND NOT EXISTS (
    SELECT 1
    FROM matches m
    WHERE m.scrim_id = s.id
      AND m.map_name = 'Bind'
  );
