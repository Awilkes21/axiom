CREATE TABLE IF NOT EXISTS titles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,   -- e.g., "Valorant", "Counter-Strike 2"
    short_name VARCHAR(20),              -- optional, e.g., "VAL", "CS2"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

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