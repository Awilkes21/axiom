CREATE TABLE IF NOT EXISTS titles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,   -- e.g., "Valorant", "Counter-Strike 2"
    short_name VARCHAR(20),              -- optional, e.g., "VAL", "CS2"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);