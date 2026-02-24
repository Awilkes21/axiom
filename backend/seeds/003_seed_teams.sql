INSERT INTO teams (name, title_id, visibility)
SELECT 'Team Alpha', t.id, 'public'
FROM titles t
WHERE t.name = 'Valorant'
  AND NOT EXISTS (
    SELECT 1
    FROM teams tm
    WHERE tm.name = 'Team Alpha' AND tm.title_id = t.id
  )
ORDER BY t.id
LIMIT 1;

INSERT INTO teams (name, title_id, visibility)
SELECT 'Team Bravo', t.id, 'private'
FROM titles t
WHERE t.name = 'Counter-Strike 2'
  AND NOT EXISTS (
    SELECT 1
    FROM teams tm
    WHERE tm.name = 'Team Bravo' AND tm.title_id = t.id
  )
ORDER BY t.id
LIMIT 1;

UPDATE teams
SET visibility = 'public'
WHERE name = 'Team Alpha'
  AND title_id = (SELECT id FROM titles WHERE name = 'Valorant' ORDER BY id LIMIT 1);

UPDATE teams
SET visibility = 'private'
WHERE name = 'Team Bravo'
  AND title_id = (SELECT id FROM titles WHERE name = 'Counter-Strike 2' ORDER BY id LIMIT 1);
