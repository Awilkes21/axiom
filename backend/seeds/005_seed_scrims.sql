-- Seed scrims for local development and calendar/testing scenarios.
INSERT INTO scrims (team1_id, team2_id, scheduled_at, status)
SELECT
    (SELECT id FROM teams WHERE name = 'Team Alpha' ORDER BY id LIMIT 1),
    (SELECT id FROM teams WHERE name = 'Team Bravo' ORDER BY id LIMIT 1),
    TIMESTAMP '2026-03-01 18:00:00',
    'pending'
WHERE NOT EXISTS (
    SELECT 1
    FROM scrims s
    WHERE s.team1_id = (SELECT id FROM teams WHERE name = 'Team Alpha' ORDER BY id LIMIT 1)
      AND s.team2_id = (SELECT id FROM teams WHERE name = 'Team Bravo' ORDER BY id LIMIT 1)
      AND s.scheduled_at = TIMESTAMP '2026-03-01 18:00:00'
);

INSERT INTO scrims (team1_id, team2_id, scheduled_at, status)
SELECT
    (SELECT id FROM teams WHERE name = 'Team Bravo' ORDER BY id LIMIT 1),
    (SELECT id FROM teams WHERE name = 'Team Alpha' ORDER BY id LIMIT 1),
    TIMESTAMP '2026-03-03 20:30:00',
    'confirmed'
WHERE NOT EXISTS (
    SELECT 1
    FROM scrims s
    WHERE s.team1_id = (SELECT id FROM teams WHERE name = 'Team Bravo' ORDER BY id LIMIT 1)
      AND s.team2_id = (SELECT id FROM teams WHERE name = 'Team Alpha' ORDER BY id LIMIT 1)
      AND s.scheduled_at = TIMESTAMP '2026-03-03 20:30:00'
);

INSERT INTO scrims (team1_id, team2_id, scheduled_at, status)
SELECT
    (SELECT id FROM teams WHERE name = 'Team Alpha' ORDER BY id LIMIT 1),
    (SELECT id FROM teams WHERE name = 'Team Bravo' ORDER BY id LIMIT 1),
    TIMESTAMP '2026-03-05 17:00:00',
    'canceled'
WHERE NOT EXISTS (
    SELECT 1
    FROM scrims s
    WHERE s.team1_id = (SELECT id FROM teams WHERE name = 'Team Alpha' ORDER BY id LIMIT 1)
      AND s.team2_id = (SELECT id FROM teams WHERE name = 'Team Bravo' ORDER BY id LIMIT 1)
      AND s.scheduled_at = TIMESTAMP '2026-03-05 17:00:00'
);
