-- scrim scheduling data
CREATE TABLE IF NOT EXISTS scrims (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team1_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    team2_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CHECK (team1_id <> team2_id) -- makes sure you can’t scrim yourself
);
