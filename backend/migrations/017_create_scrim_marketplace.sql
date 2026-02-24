CREATE TABLE IF NOT EXISTS scrim_posts (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    host_team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title_id INT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_by_account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CHECK (ends_at > starts_at),
    CHECK (status IN ('open', 'closed', 'canceled'))
);

CREATE TABLE IF NOT EXISTS scrim_applications (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scrim_post_id INT NOT NULL REFERENCES scrim_posts(id) ON DELETE CASCADE,
    requesting_team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    requested_by_account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    UNIQUE (scrim_post_id, requesting_team_id)
);
