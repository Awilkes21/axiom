function normalizeTeamPair(teamAId, teamBId) {
  return teamAId < teamBId ? [teamAId, teamBId] : [teamBId, teamAId];
}

export async function getOrCreateTeamConversation(
  db,
  { team1Id, team2Id, createdByAccountId, scrimPostId = null, scrimApplicationId = null },
) {
  const [normalizedTeam1Id, normalizedTeam2Id] = normalizeTeamPair(team1Id, team2Id);
  const existing = await db.query(
    `SELECT id, conversation_type, team1_id, team2_id, created_by_account_id,
            scrim_post_id, scrim_application_id, created_at, updated_at
     FROM conversations
     WHERE conversation_type = 'team'
       AND team1_id = $1
       AND team2_id = $2
     LIMIT 1`,
    [normalizedTeam1Id, normalizedTeam2Id],
  );

  if (existing.rowCount > 0) {
    const conversation = existing.rows[0];
    if (
      (scrimPostId && !conversation.scrim_post_id) ||
      (scrimApplicationId && !conversation.scrim_application_id)
    ) {
      const updated = await db.query(
        `UPDATE conversations
         SET scrim_post_id = COALESCE(scrim_post_id, $2),
             scrim_application_id = COALESCE(scrim_application_id, $3)
         WHERE id = $1
         RETURNING id, conversation_type, team1_id, team2_id, created_by_account_id,
                   scrim_post_id, scrim_application_id, created_at, updated_at`,
        [conversation.id, scrimPostId, scrimApplicationId],
      );
      return updated.rows[0];
    }

    return conversation;
  }

  const result = await db.query(
    `INSERT INTO conversations
     (conversation_type, team1_id, team2_id, created_by_account_id, scrim_post_id, scrim_application_id)
     VALUES ('team', $1, $2, $3, $4, $5)
     RETURNING id, conversation_type, team1_id, team2_id, created_by_account_id,
               scrim_post_id, scrim_application_id, created_at, updated_at`,
    [normalizedTeam1Id, normalizedTeam2Id, createdByAccountId, scrimPostId, scrimApplicationId],
  );

  return result.rows[0];
}

export async function createConversationMessage(
  db,
  { conversationId, senderTeamId, senderAccountId, body, messageType = "message", metadata = {} },
) {
  const result = await db.query(
    `INSERT INTO conversation_messages
     (conversation_id, sender_team_id, sender_account_id, body, message_type, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, conversation_id, sender_team_id, sender_account_id, body, message_type, metadata, created_at`,
    [
      conversationId,
      senderTeamId ?? null,
      senderAccountId ?? null,
      body,
      messageType,
      JSON.stringify(metadata ?? {}),
    ],
  );

  await db.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [conversationId]);

  return result.rows[0];
}
