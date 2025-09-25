-- Seed initial esports titles
INSERT INTO titles (name, short_name)
VALUES 
    ('Valorant', 'VAL'),
    ('Counter-Strike 2', 'CS2'),
    ('League of Legends', 'LoL'),
    ('Dota 2', 'DOTA'),
    ('Overwatch 2', 'OW2'),
    ('Deadlock', 'DL')
ON CONFLICT (name) DO NOTHING;