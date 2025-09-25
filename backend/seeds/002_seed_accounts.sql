INSERT INTO accounts (email, password_hash, display_name)
VALUES
    ('player1@example.com', 'hashed_pw_1', 'PlayerOne'),
    ('coach1@example.com', 'hashed_pw_2', 'CoachSmith'),
    ('manager1@example.com', 'hashed_pw_3', 'ManagerLee')
ON CONFLICT (email) DO NOTHING;