import { hasMembershipOnTeam } from "../services/permissions.service.js";
import {
  createConversationMessage,
  getOrCreateTeamConversation,
} from "../services/messages.service.js";
import { publishRealtimeEvent } from "../services/realtime.service.js";

function toTeam(row, prefix) {
  return {
    id: row[`${prefix}_id`],
    name: row[`${prefix}_name`],
    titleId: row[`${prefix}_title_id`],
    visibility: row[`${prefix}_visibility`],
  };
}

function toConversationDto(row, accountTeamIds = []) {
  const team1 = toTeam(row, "team1");
  const team2 = toTeam(row, "team2");
  const accountTeamIdSet = new Set(accountTeamIds);
  const otherTeam = accountTeamIdSet.has(team1.id) && !accountTeamIdSet.has(team2.id) ? team2 : team1;

  return {
    id: row.id,
    conversationType: row.conversation_type,
    team1,
    team2,
    otherTeam,
    scrimPostId: row.scrim_post_id,
    scrimApplicationId: row.scrim_application_id,
    latestMessage: row.latest_message_body
      ? {
          id: row.latest_message_id,
          body: row.latest_message_body,
          messageType: row.latest_message_type,
          senderTeamId: row.latest_sender_team_id,
          createdAt: row.latest_message_created_at,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessageDto(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderTeamId: row.sender_team_id,
    senderTeamName: row.sender_team_name,
    senderAccountId: row.sender_account_id,
    senderDisplayName: row.sender_display_name,
    body: row.body,
    messageType: row.message_type,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

async function getAccountTeamIds(db, accountId) {
  const result = await db.query("SELECT team_id FROM team_memberships WHERE account_id = $1", [
    accountId,
  ]);
  return result.rows.map((row) => row.team_id);
}

async function getConversationForAccount(db, conversationId, accountId) {
  const result = await db.query(
    `SELECT c.id, c.conversation_type, c.team1_id, c.team2_id
     FROM conversations c
     WHERE c.id = $1
       AND c.conversation_type = 'team'
       AND EXISTS (
         SELECT 1
         FROM team_memberships tm
         WHERE tm.account_id = $2
           AND tm.team_id IN (c.team1_id, c.team2_id)
       )
     LIMIT 1`,
    [conversationId, accountId],
  );

  return result.rows[0] ?? null;
}

export async function listConversationsHandler(req, res) {
  try {
    const db = req.app.locals.pool;
    const accountTeamIds = await getAccountTeamIds(db, req.auth.accountId);
    const result = await db.query(
      `SELECT
         c.id, c.conversation_type, c.scrim_post_id, c.scrim_application_id,
         c.created_at, c.updated_at,
         t1.id AS team1_id, t1.name AS team1_name, t1.title_id AS team1_title_id, t1.visibility AS team1_visibility,
         t2.id AS team2_id, t2.name AS team2_name, t2.title_id AS team2_title_id, t2.visibility AS team2_visibility,
         lm.id AS latest_message_id, lm.body AS latest_message_body,
         lm.message_type AS latest_message_type, lm.sender_team_id AS latest_sender_team_id,
         lm.created_at AS latest_message_created_at
       FROM conversations c
       JOIN teams t1 ON t1.id = c.team1_id
       JOIN teams t2 ON t2.id = c.team2_id
       LEFT JOIN LATERAL (
         SELECT id, body, message_type, sender_team_id, created_at
         FROM conversation_messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC, id DESC
         LIMIT 1
       ) lm ON true
       WHERE c.conversation_type = 'team'
         AND EXISTS (
           SELECT 1
           FROM team_memberships tm
           WHERE tm.account_id = $1
             AND tm.team_id IN (c.team1_id, c.team2_id)
         )
       ORDER BY c.updated_at DESC, c.id DESC`,
      [req.auth.accountId],
    );

    return res.status(200).json({
      conversations: result.rows.map((row) => toConversationDto(row, accountTeamIds)),
    });
  } catch (error) {
    console.error("List conversations failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function createConversationHandler(req, res) {
  const { teamId, recipientTeamId } = req.body ?? {};

  if (!Number.isInteger(teamId) || !Number.isInteger(recipientTeamId)) {
    return res.status(400).json({ message: "teamId and recipientTeamId are required." });
  }

  if (teamId === recipientTeamId) {
    return res.status(400).json({ message: "Choose two different teams." });
  }

  try {
    const db = req.app.locals.pool;
    const hasMembership = await hasMembershipOnTeam(db, req.auth.accountId, teamId);
    if (!hasMembership) {
      return res.status(403).json({ message: "You can only message from your own teams." });
    }

    const recipientResult = await db.query("SELECT id FROM teams WHERE id = $1", [recipientTeamId]);
    if (recipientResult.rowCount === 0) {
      return res.status(404).json({ message: "Recipient team not found." });
    }

    const conversation = await getOrCreateTeamConversation(db, {
      team1Id: teamId,
      team2Id: recipientTeamId,
      createdByAccountId: req.auth.accountId,
    });

    return res.status(201).json({ conversationId: conversation.id });
  } catch (error) {
    console.error("Create conversation failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function listConversationMessagesHandler(req, res) {
  const conversationId = Number(req.params.conversationId);

  if (!Number.isInteger(conversationId)) {
    return res.status(400).json({ message: "conversationId must be an integer." });
  }

  try {
    const db = req.app.locals.pool;
    const conversation = await getConversationForAccount(db, conversationId, req.auth.accountId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const result = await db.query(
      `SELECT
         cm.id, cm.conversation_id, cm.sender_team_id, st.name AS sender_team_name,
         cm.sender_account_id, a.display_name AS sender_display_name,
         cm.body, cm.message_type, cm.metadata, cm.created_at
       FROM conversation_messages cm
       LEFT JOIN teams st ON st.id = cm.sender_team_id
       LEFT JOIN accounts a ON a.id = cm.sender_account_id
       WHERE cm.conversation_id = $1
       ORDER BY cm.created_at ASC, cm.id ASC`,
      [conversationId],
    );

    return res.status(200).json({ messages: result.rows.map(toMessageDto) });
  } catch (error) {
    console.error("List conversation messages failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function createConversationMessageHandler(req, res) {
  const conversationId = Number(req.params.conversationId);
  const { senderTeamId, body } = req.body ?? {};
  const trimmedBody = typeof body === "string" ? body.trim() : "";

  if (!Number.isInteger(conversationId) || !Number.isInteger(senderTeamId) || !trimmedBody) {
    return res.status(400).json({ message: "conversationId, senderTeamId, and body are required." });
  }

  if (trimmedBody.length > 2000) {
    return res.status(400).json({ message: "Message must be 2000 characters or less." });
  }

  try {
    const db = req.app.locals.pool;
    const conversation = await getConversationForAccount(db, conversationId, req.auth.accountId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    if (![conversation.team1_id, conversation.team2_id].includes(senderTeamId)) {
      return res.status(400).json({ message: "senderTeamId must belong to the conversation." });
    }

    const hasMembership = await hasMembershipOnTeam(db, req.auth.accountId, senderTeamId);
    if (!hasMembership) {
      return res.status(403).json({ message: "You can only message from your own teams." });
    }

    const message = await createConversationMessage(db, {
      conversationId,
      senderTeamId,
      senderAccountId: req.auth.accountId,
      body: trimmedBody,
      messageType: "message",
    });

    await publishRealtimeEvent({
      type: "message:created",
      message: "New team message.",
      tone: "success",
      teamIds: [conversation.team1_id, conversation.team2_id],
      conversationId,
    });

    const decorated = await db.query(
      `SELECT
         cm.id, cm.conversation_id, cm.sender_team_id, st.name AS sender_team_name,
         cm.sender_account_id, a.display_name AS sender_display_name,
         cm.body, cm.message_type, cm.metadata, cm.created_at
       FROM conversation_messages cm
       LEFT JOIN teams st ON st.id = cm.sender_team_id
       LEFT JOIN accounts a ON a.id = cm.sender_account_id
       WHERE cm.id = $1`,
      [message.id],
    );

    return res.status(201).json({ message: toMessageDto(decorated.rows[0]) });
  } catch (error) {
    console.error("Create conversation message failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}
