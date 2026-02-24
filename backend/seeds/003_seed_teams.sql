INSERT INTO teams (name, title_id)
SELECT 'Team Alpha', t.id
FROM titles t
WHERE t.name = 'Valorant'
  AND NOT EXISTS (
    SELECT 1
    FROM teams tm
    WHERE tm.name = 'Team Alpha' AND tm.title_id = t.id
  )
ORDER BY t.id
LIMIT 1;

INSERT INTO teams (name, title_id)
SELECT 'Team Bravo', t.id
FROM titles t
WHERE t.name = 'Counter-Strike 2'
  AND NOT EXISTS (
    SELECT 1
    FROM teams tm
    WHERE tm.name = 'Team Bravo' AND tm.title_id = t.id
  )
ORDER BY t.id
LIMIT 1;
