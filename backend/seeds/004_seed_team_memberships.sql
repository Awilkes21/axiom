INSERT INTO team_memberships (account_id, team_id, role)
VALUES
    ((SELECT id FROM accounts WHERE email = 'player1@example.com'),
     (SELECT id FROM teams WHERE name = 'Team Alpha' ORDER BY id LIMIT 1),
     'player'),

    ((SELECT id FROM accounts WHERE email = 'coach1@example.com'),
     (SELECT id FROM teams WHERE name = 'Team Alpha' ORDER BY id LIMIT 1),
     'coach'),

    ((SELECT id FROM accounts WHERE email = 'manager1@example.com'),
     (SELECT id FROM teams WHERE name = 'Team Bravo' ORDER BY id LIMIT 1),
     'manager')
ON CONFLICT DO NOTHING;
