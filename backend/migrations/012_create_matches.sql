-- game data
CREATE TABLE IF NOT EXISTS matches (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scrim_id INT REFERENCES scrims(id) ON DELETE CASCADE,
    map_name VARCHAR(100),
    team_score INT,
    opponent_score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CHECK (team_score >= 0 AND opponent_score >= 0) -- prevent negative scores
);