INSERT INTO team_memberships (account_id, team_id, role)
VALUES
    ((SELECT id FROM accounts WHERE email = 'player1@example.com'),
     (SELECT id FROM teams WHERE name = 'Team Alpha'),
     'player'),

    ((SELECT id FROM accounts WHERE email = 'coach1@example.com'),
     (SELECT id FROM teams WHERE name = 'Team Alpha'),
     'coach'),

    ((SELECT id FROM accounts WHERE email = 'manager1@example.com'),
     (SELECT id FROM teams WHERE name = 'Team Bravo'),
     'manager')
ON CONFLICT DO NOTHING;