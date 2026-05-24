import { hasMembershipOnTeam } from "../services/permissions.service.js";

const DEFAULT_AVAILABILITY_DAYS = 7;
const MAX_AVAILABILITY_DAYS = 14;

function toCalendarScrimDto(scrimRow) {
  const iso = new Date(scrimRow.scheduled_at).toISOString();

  return {
    id: scrimRow.id,
    scheduledAt: iso,
    opponent: {
      id: scrimRow.opponent_team_id,
      name: scrimRow.opponent_team_name,
    },
    status: scrimRow.status,
  };
}

function parseDateParam(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toAvailabilitySlotDto(row) {
  const accountIds = row.available_account_ids ?? [];
  const memberCount = Number(row.member_count ?? 0);
  const availableCount = Number(row.available_count ?? 0);

  return {
    startsAt: new Date(row.slot_start).toISOString(),
    availableAccountIds: accountIds,
    availableCount,
    memberCount,
    allAvailable: memberCount > 0 && availableCount === memberCount,
  };
}

function normalizeAvailabilitySlots(slots, windowStart, windowEnd) {
  if (!Array.isArray(slots)) {
    return null;
  }

  const normalized = [];
  const seen = new Set();
  for (const slot of slots) {
    const parsed = new Date(String(slot));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    if (parsed < windowStart || parsed >= windowEnd) {
      return null;
    }

    const iso = parsed.toISOString();
    if (!seen.has(iso)) {
      seen.add(iso);
      normalized.push(iso);
    }
  }

  return normalized;
}

async function ensureTeamMember(db, accountId, teamId) {
  const teamResult = await db.query("SELECT id FROM teams WHERE id = $1", [teamId]);
  if (teamResult.rowCount === 0) {
    return { ok: false, status: 404, message: "Team not found." };
  }

  const isMember = await hasMembershipOnTeam(db, accountId, teamId);
  if (!isMember) {
    return { ok: false, status: 403, message: "Only team members can manage availability." };
  }

  return { ok: true };
}

export async function getTeamCalendarScrimsHandler(req, res) {
  const teamId = Number(req.params.teamId);
  const upcoming = req.query.upcoming !== "false";

  if (!Number.isInteger(teamId)) {
    return res.status(400).json({ message: "teamId must be an integer." });
  }

  try {
    const db = req.app.locals.pool;
    const teamResult = await db.query(
      "SELECT id, visibility FROM teams WHERE id = $1",
      [teamId],
    );

    if (teamResult.rowCount === 0) {
      return res.status(404).json({ message: "Team not found." });
    }

    if (teamResult.rows[0].visibility === "private") {
      const isMember = await hasMembershipOnTeam(db, req.auth.accountId, teamId);
      if (!isMember) {
        return res.status(403).json({ message: "This team is private." });
      }
    }

    const scrimsResult = await db.query(
      `SELECT
         s.id,
         s.scheduled_at,
         s.status,
         CASE
           WHEN s.team1_id = $1 THEN s.team2_id
           ELSE s.team1_id
         END AS opponent_team_id,
         opponent.name AS opponent_team_name
       FROM scrims s
       JOIN teams opponent
         ON opponent.id = CASE WHEN s.team1_id = $1 THEN s.team2_id ELSE s.team1_id END
       WHERE (s.team1_id = $1 OR s.team2_id = $1)
         AND ($2::boolean = false OR s.scheduled_at >= NOW())
       ORDER BY s.scheduled_at ASC`,
      [teamId, upcoming],
    );

    return res.status(200).json({
      teamId,
      upcoming,
      scrims: scrimsResult.rows.map(toCalendarScrimDto),
    });
  } catch (error) {
    console.error("Get team calendar scrims failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function getTeamAvailabilityHandler(req, res) {
  const teamId = Number(req.params.teamId);
  const days = req.query.days ? Number(req.query.days) : DEFAULT_AVAILABILITY_DAYS;

  if (!Number.isInteger(teamId)) {
    return res.status(400).json({ message: "teamId must be an integer." });
  }

  if (!Number.isInteger(days) || days < 1 || days > MAX_AVAILABILITY_DAYS) {
    return res.status(400).json({ message: "days must be an integer from 1 to 14." });
  }

  const windowStart = parseDateParam(req.query.start, new Date());
  if (!windowStart) {
    return res.status(400).json({ message: "start must be a valid date string." });
  }
  const windowEnd = addDays(windowStart, days);

  try {
    const db = req.app.locals.pool;
    const access = await ensureTeamMember(db, req.auth.accountId, teamId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const slotsResult = await db.query(
      `WITH member_count AS (
         SELECT COUNT(DISTINCT account_id)::INT AS count
         FROM team_memberships
         WHERE team_id = $1
       )
       SELECT
         ta.slot_start,
         ARRAY_AGG(ta.account_id ORDER BY ta.account_id) AS available_account_ids,
         COUNT(DISTINCT ta.account_id)::INT AS available_count,
         member_count.count AS member_count
       FROM team_availability ta
       CROSS JOIN member_count
       WHERE ta.team_id = $1
         AND ta.slot_start >= $2
         AND ta.slot_start < $3
       GROUP BY ta.slot_start, member_count.count
       ORDER BY ta.slot_start ASC`,
      [teamId, windowStart.toISOString(), windowEnd.toISOString()],
    );

    const mineResult = await db.query(
      `SELECT slot_start
       FROM team_availability
       WHERE team_id = $1
         AND account_id = $2
         AND slot_start >= $3
         AND slot_start < $4
       ORDER BY slot_start ASC`,
      [teamId, req.auth.accountId, windowStart.toISOString(), windowEnd.toISOString()],
    );

    return res.status(200).json({
      teamId,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      mine: mineResult.rows.map((row) => new Date(row.slot_start).toISOString()),
      slots: slotsResult.rows.map(toAvailabilitySlotDto),
    });
  } catch (error) {
    console.error("Get team availability failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function updateTeamAvailabilityHandler(req, res) {
  const teamId = Number(req.params.teamId);
  const { slots, windowStart: rawWindowStart, windowEnd: rawWindowEnd } = req.body ?? {};

  if (!Number.isInteger(teamId)) {
    return res.status(400).json({ message: "teamId must be an integer." });
  }

  const windowStart = parseDateParam(rawWindowStart, null);
  const windowEnd = parseDateParam(rawWindowEnd, null);
  if (!windowStart || !windowEnd || windowEnd <= windowStart) {
    return res.status(400).json({ message: "windowStart and windowEnd must be valid date strings." });
  }

  const normalizedSlots = normalizeAvailabilitySlots(slots, windowStart, windowEnd);
  if (!normalizedSlots) {
    return res.status(400).json({
      message: "slots must be valid date strings inside the selected window.",
    });
  }

  try {
    const db = req.app.locals.pool;
    const access = await ensureTeamMember(db, req.auth.accountId, teamId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    await db.query(
      `DELETE FROM team_availability
       WHERE team_id = $1
         AND account_id = $2
         AND slot_start >= $3
         AND slot_start < $4`,
      [teamId, req.auth.accountId, windowStart.toISOString(), windowEnd.toISOString()],
    );

    if (normalizedSlots.length > 0) {
      await db.query(
        `INSERT INTO team_availability (team_id, account_id, slot_start)
         SELECT $1, $2, unnest($3::timestamp[])
         ON CONFLICT (team_id, account_id, slot_start) DO NOTHING`,
        [teamId, req.auth.accountId, normalizedSlots],
      );
    }

    return res.status(200).json({
      teamId,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      mine: normalizedSlots,
    });
  } catch (error) {
    console.error("Update team availability failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}
