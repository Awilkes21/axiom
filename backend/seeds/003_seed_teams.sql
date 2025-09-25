INSERT INTO teams (name, title_id)
VALUES
    ('Team Alpha', (SELECT id FROM titles WHERE name = 'Valorant')),
    ('Team Bravo', (SELECT id FROM titles WHERE name = 'Counter-Strike 2'))
ON CONFLICT DO NOTHING;