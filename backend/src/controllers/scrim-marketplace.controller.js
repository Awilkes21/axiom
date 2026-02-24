import { hasTeamManagementAccess } from "../services/permissions.service.js";

const SCRIM_POST_STATUSES = ["open", "closed", "canceled"];
const SCRIM_APPLICATION_STATUSES = ["pending", "accepted", "rejected", "withdrawn"];

function isValidIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function toScrimPostDto(row) {
  return {
    id: row.id,
    hostTeamId: row.host_team_id,
    hostTeamName: row.host_team_name,
    titleId: row.title_id,
    titleName: row.title_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    notes: row.notes,
    status: row.status,
    createdByAccountId: row.created_by_account_id,
    createdAt: row.created_at,
  };
}

function toScrimApplicationDto(row) {
  return {
    id: row.id,
    scrimPostId: row.scrim_post_id,
    requestingTeamId: row.requesting_team_id,
    requestingTeamName: row.requesting_team_name,
    requestedByAccountId: row.requested_by_account_id,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function createScrimPostHandler(req, res) {
  const { hostTeamId, startsAt, endsAt, notes } = req.body ?? {};

  if (!Number.isInteger(hostTeamId) || !isValidIsoDate(startsAt) || !isValidIsoDate(endsAt)) {
    return res.status(400).json({
      message: "hostTeamId, startsAt, and endsAt are required.",
    });
  }

  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return res.status(400).json({ message: "endsAt must be after startsAt." });
  }

  try {
    const db = req.app.locals.pool;
    const canManage = await hasTeamManagementAccess(db, req.auth.accountId, hostTeamId);
    if (!canManage) {
      return res.status(403).json({
        message: "Only team owners/managers can post scrim requests.",
      });
    }

    const teamResult = await db.query("SELECT id, title_id FROM teams WHERE id = $1", [hostTeamId]);
    if (teamResult.rowCount === 0) {
      return res.status(404).json({ message: "Host team not found." });
    }

    const titleId = teamResult.rows[0].title_id;
    const result = await db.query(
      `INSERT INTO scrim_posts
       (host_team_id, title_id, starts_at, ends_at, notes, status, created_by_account_id)
       VALUES ($1, $2, $3, $4, $5, 'open', $6)
       RETURNING id, host_team_id, title_id, starts_at, ends_at, notes, status, created_by_account_id, created_at`,
      [hostTeamId, titleId, startsAt, endsAt, notes ?? null, req.auth.accountId],
    );

    const row = result.rows[0];
    const decorated = await db.query(
      `SELECT
         sp.id, sp.host_team_id, t.name AS host_team_name,
         sp.title_id, ti.name AS title_name,
         sp.starts_at, sp.ends_at, sp.notes, sp.status,
         sp.created_by_account_id, sp.created_at
       FROM scrim_posts sp
       JOIN teams t ON t.id = sp.host_team_id
       JOIN titles ti ON ti.id = sp.title_id
       WHERE sp.id = $1`,
      [row.id],
    );

    return res.status(201).json({ post: toScrimPostDto(decorated.rows[0]) });
  } catch (error) {
    console.error("Create scrim post failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function listScrimPostsHandler(req, res) {
  const status = req.query.status ? String(req.query.status) : "open";
  const titleId = req.query.titleId ? Number(req.query.titleId) : null;
  const hostTeamId = req.query.hostTeamId ? Number(req.query.hostTeamId) : null;

  if (!SCRIM_POST_STATUSES.includes(status)) {
    return res.status(400).json({ message: "status must be open, closed, or canceled." });
  }

  if (titleId !== null && !Number.isInteger(titleId)) {
    return res.status(400).json({ message: "titleId must be an integer." });
  }

  if (hostTeamId !== null && !Number.isInteger(hostTeamId)) {
    return res.status(400).json({ message: "hostTeamId must be an integer." });
  }

  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      `SELECT
         sp.id, sp.host_team_id, t.name AS host_team_name,
         sp.title_id, ti.name AS title_name,
         sp.starts_at, sp.ends_at, sp.notes, sp.status,
         sp.created_by_account_id, sp.created_at
       FROM scrim_posts sp
       JOIN teams t ON t.id = sp.host_team_id
       JOIN titles ti ON ti.id = sp.title_id
       WHERE ($1::text IS NULL OR sp.status = $1)
         AND ($2::int IS NULL OR sp.title_id = $2)
         AND ($3::int IS NULL OR sp.host_team_id = $3)
       ORDER BY sp.starts_at ASC`,
      [status ?? null, titleId, hostTeamId],
    );

    return res.status(200).json({ posts: result.rows.map(toScrimPostDto) });
  } catch (error) {
    console.error("List scrim posts failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function createScrimApplicationHandler(req, res) {
  const postId = Number(req.params.postId);
  const { requestingTeamId, message } = req.body ?? {};

  if (!Number.isInteger(postId) || !Number.isInteger(requestingTeamId)) {
    return res.status(400).json({ message: "postId and requestingTeamId are required." });
  }

  try {
    const db = req.app.locals.pool;
    const canManageRequestingTeam = await hasTeamManagementAccess(
      db,
      req.auth.accountId,
      requestingTeamId,
    );
    if (!canManageRequestingTeam) {
      return res.status(403).json({
        message: "Only team owners/managers can request scrims.",
      });
    }

    const postResult = await db.query(
      "SELECT id, host_team_id, title_id, status FROM scrim_posts WHERE id = $1",
      [postId],
    );
    if (postResult.rowCount === 0) {
      return res.status(404).json({ message: "Scrim post not found." });
    }

    const post = postResult.rows[0];
    if (post.status !== "open") {
      return res.status(400).json({ message: "Scrim post is not open." });
    }

    if (post.host_team_id === requestingTeamId) {
      return res.status(400).json({ message: "Host team cannot apply to its own post." });
    }

    const requestingTeamResult = await db.query("SELECT id, title_id FROM teams WHERE id = $1", [
      requestingTeamId,
    ]);
    if (requestingTeamResult.rowCount === 0) {
      return res.status(404).json({ message: "Requesting team not found." });
    }

    if (requestingTeamResult.rows[0].title_id !== post.title_id) {
      return res.status(400).json({ message: "Requesting team must match the post title/game." });
    }

    const existingResult = await db.query(
      `SELECT id, status
       FROM scrim_applications
       WHERE scrim_post_id = $1 AND requesting_team_id = $2
       LIMIT 1`,
      [postId, requestingTeamId],
    );

    if (existingResult.rowCount > 0) {
      const existing = existingResult.rows[0];
      if (existing.status === "pending" || existing.status === "accepted") {
        return res.status(409).json({ message: "Application already exists for this team." });
      }

      const updateResult = await db.query(
        `UPDATE scrim_applications
         SET status = 'pending',
             message = $3,
             requested_by_account_id = $4
         WHERE id = $1
         RETURNING id, scrim_post_id, requesting_team_id, requested_by_account_id, message, status, created_at`,
        [existing.id, postId, message ?? null, req.auth.accountId],
      );

      const decorated = await db.query(
        `SELECT
           sa.id, sa.scrim_post_id, sa.requesting_team_id, t.name AS requesting_team_name,
           sa.requested_by_account_id, sa.message, sa.status, sa.created_at
         FROM scrim_applications sa
         JOIN teams t ON t.id = sa.requesting_team_id
         WHERE sa.id = $1`,
        [updateResult.rows[0].id],
      );

      return res.status(201).json({ application: toScrimApplicationDto(decorated.rows[0]) });
    }

    const result = await db.query(
      `INSERT INTO scrim_applications
       (scrim_post_id, requesting_team_id, requested_by_account_id, message, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, scrim_post_id, requesting_team_id, requested_by_account_id, message, status, created_at`,
      [postId, requestingTeamId, req.auth.accountId, message ?? null],
    );

    const decorated = await db.query(
      `SELECT
         sa.id, sa.scrim_post_id, sa.requesting_team_id, t.name AS requesting_team_name,
         sa.requested_by_account_id, sa.message, sa.status, sa.created_at
       FROM scrim_applications sa
       JOIN teams t ON t.id = sa.requesting_team_id
       WHERE sa.id = $1`,
      [result.rows[0].id],
    );

    return res.status(201).json({ application: toScrimApplicationDto(decorated.rows[0]) });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Application already exists for this team." });
    }

    console.error("Create scrim application failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function listScrimPostApplicationsHandler(req, res) {
  const postId = Number(req.params.postId);
  const status = req.query.status ? String(req.query.status) : null;

  if (!Number.isInteger(postId)) {
    return res.status(400).json({ message: "postId must be an integer." });
  }

  if (status !== null && !SCRIM_APPLICATION_STATUSES.includes(status)) {
    return res.status(400).json({
      message: "status must be pending, accepted, rejected, or withdrawn.",
    });
  }

  try {
    const db = req.app.locals.pool;
    const postResult = await db.query("SELECT id, host_team_id FROM scrim_posts WHERE id = $1", [postId]);
    if (postResult.rowCount === 0) {
      return res.status(404).json({ message: "Scrim post not found." });
    }

    const canManage = await hasTeamManagementAccess(
      db,
      req.auth.accountId,
      postResult.rows[0].host_team_id,
    );
    if (!canManage) {
      return res.status(403).json({
        message: "Only host team owners/managers can view applications.",
      });
    }

    const result = await db.query(
      `SELECT
         sa.id, sa.scrim_post_id, sa.requesting_team_id, t.name AS requesting_team_name,
         sa.requested_by_account_id, sa.message, sa.status, sa.created_at
       FROM scrim_applications sa
       JOIN teams t ON t.id = sa.requesting_team_id
       WHERE sa.scrim_post_id = $1
         AND ($2::text IS NULL OR sa.status = $2)
       ORDER BY sa.created_at ASC`,
      [postId, status],
    );

    return res.status(200).json({ applications: result.rows.map(toScrimApplicationDto) });
  } catch (error) {
    console.error("List scrim applications failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function decideScrimApplicationHandler(req, res) {
  const applicationId = Number(req.params.applicationId);
  const { decision } = req.body ?? {};

  if (!Number.isInteger(applicationId) || !["accepted", "rejected"].includes(decision)) {
    return res.status(400).json({ message: "applicationId and decision are required." });
  }

  try {
    const db = req.app.locals.pool;
    const applicationResult = await db.query(
      `SELECT
         sa.id, sa.scrim_post_id, sa.requesting_team_id, sa.status AS application_status,
         sp.host_team_id, sp.starts_at, sp.status AS post_status
       FROM scrim_applications sa
       JOIN scrim_posts sp ON sp.id = sa.scrim_post_id
       WHERE sa.id = $1`,
      [applicationId],
    );

    if (applicationResult.rowCount === 0) {
      return res.status(404).json({ message: "Application not found." });
    }

    const record = applicationResult.rows[0];
    const canManage = await hasTeamManagementAccess(db, req.auth.accountId, record.host_team_id);
    if (!canManage) {
      return res.status(403).json({
        message: "Only host team owners/managers can review applications.",
      });
    }

    if (record.post_status !== "open") {
      return res.status(400).json({ message: "Scrim post is not open." });
    }

    if (record.application_status !== "pending") {
      return res.status(400).json({ message: "Only pending applications can be decided." });
    }

    const updateApplicationResult = await db.query(
      `UPDATE scrim_applications
       SET status = $2
       WHERE id = $1
       RETURNING id, scrim_post_id, requesting_team_id, requested_by_account_id, message, status, created_at`,
      [applicationId, decision],
    );

    if (decision === "accepted") {
      await db.query(
        `UPDATE scrim_applications
         SET status = 'rejected'
         WHERE scrim_post_id = $1
           AND id <> $2
           AND status = 'pending'`,
        [record.scrim_post_id, applicationId],
      );

      await db.query("UPDATE scrim_posts SET status = 'closed' WHERE id = $1", [record.scrim_post_id]);

      await db.query(
        `INSERT INTO scrims (team1_id, team2_id, scheduled_at, status)
         VALUES ($1, $2, $3, 'confirmed')`,
        [record.host_team_id, record.requesting_team_id, record.starts_at],
      );
    }

    const decorated = await db.query(
      `SELECT
         sa.id, sa.scrim_post_id, sa.requesting_team_id, t.name AS requesting_team_name,
         sa.requested_by_account_id, sa.message, sa.status, sa.created_at
       FROM scrim_applications sa
       JOIN teams t ON t.id = sa.requesting_team_id
       WHERE sa.id = $1`,
      [updateApplicationResult.rows[0].id],
    );

    return res.status(200).json({ application: toScrimApplicationDto(decorated.rows[0]) });
  } catch (error) {
    console.error("Decide scrim application failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}
