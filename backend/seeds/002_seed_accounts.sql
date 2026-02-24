INSERT INTO accounts (email, password_hash, display_name)
VALUES
    ('player1@example.com', '$2b$12$7fQHMSwmZuMIBQjZk1/25u3P.nMWs/T.PPcVyxDbq83zW0N7zZCKa', 'PlayerOne'),
    ('coach1@example.com', '$2b$12$WViBu7e4tLfn9W5hRzsJuu4/TrGjY49DMpjZGEHuJJy3v5YlvbwqC', 'CoachSmith'),
    ('manager1@example.com', '$2b$12$lj2iE4jWIokrgXLy7VNFD.nUCpgCNNINJEqVczo/W/RUKX9IiVJgW', 'ManagerLee')
ON CONFLICT (email) DO UPDATE
SET
    password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name;
