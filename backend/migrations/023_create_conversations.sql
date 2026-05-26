CREATE TABLE IF NOT EXISTS conversations (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_type VARCHAR(20) NOT NULL DEFAULT 'team',
  team1_id INT REFERENCES teams(id) ON DELETE CASCADE,
  team2_id INT REFERENCES teams(id) ON DELETE CASCADE,
  player1_account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
  player2_account_id INT REFERENCES accounts(id) ON DELETE CASCADE,
  created_by_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
  scrim_post_id INT REFERENCES scrim_posts(id) ON DELETE SET NULL,
  scrim_application_id INT REFERENCES scrim_applications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_type_check CHECK (conversation_type IN ('team', 'player')),
  CONSTRAINT conversations_team_participants_check CHECK (
    conversation_type <> 'team'
    OR (
      team1_id IS NOT NULL
      AND team2_id IS NOT NULL
      AND team1_id <> team2_id
      AND player1_account_id IS NULL
      AND player2_account_id IS NULL
    )
  ),
  CONSTRAINT conversations_player_participants_check CHECK (
    conversation_type <> 'player'
    OR (
      player1_account_id IS NOT NULL
      AND player2_account_id IS NOT NULL
      AND player1_account_id <> player2_account_id
      AND team1_id IS NULL
      AND team2_id IS NULL
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS conversations_team_pair_unique
  ON conversations (LEAST(team1_id, team2_id), GREATEST(team1_id, team2_id))
  WHERE conversation_type = 'team';

CREATE UNIQUE INDEX IF NOT EXISTS conversations_player_pair_unique
  ON conversations (LEAST(player1_account_id, player2_account_id), GREATEST(player1_account_id, player2_account_id))
  WHERE conversation_type = 'player';

DROP TRIGGER IF EXISTS trigger_set_updated_at_conversations ON conversations;
CREATE TRIGGER trigger_set_updated_at_conversations
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS conversation_messages (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_team_id INT REFERENCES teams(id) ON DELETE SET NULL,
  sender_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  message_type VARCHAR(30) NOT NULL DEFAULT 'message',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversation_messages_type_check CHECK (
    message_type IN ('message', 'scrim_request', 'scrim_response', 'system')
  ),
  CONSTRAINT conversation_messages_body_check CHECK (
    char_length(trim(body)) BETWEEN 1 AND 2000
  )
);

CREATE INDEX IF NOT EXISTS conversation_messages_conversation_created_idx
  ON conversation_messages (conversation_id, created_at);
