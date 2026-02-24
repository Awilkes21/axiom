const SCRIM_STATUSES = ["pending", "confirmed", "canceled"];

function isValidIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function toScrimDto(scrimRow) {
  return {
    id: scrimRow.id,
    team1Id: scrimRow.team1_id,
    team2Id: scrimRow.team2_id,
    scheduledAt: scrimRow.scheduled_at,
    status: scrimRow.status,
  };
}

export async function createScrimHandler(req, res) {
  const { team1Id, team2Id, scheduledAt } = req.body ?? {};

  if (
    !Number.isInteger(team1Id) ||
    !Number.isInteger(team2Id) ||
    !isValidIsoDate(scheduledAt) ||
    team1Id === team2Id
  ) {
    return res.status(400).json({
      message: "team1Id, team2Id, and valid scheduledAt are required. team IDs must differ.",
    });
  }

  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      `INSERT INTO scrims (team1_id, team2_id, scheduled_at, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id, team1_id, team2_id, scheduled_at, status`,
      [team1Id, team2Id, scheduledAt],
    );

    return res.status(201).json({ scrim: toScrimDto(result.rows[0]) });
  } catch (error) {
    console.error("Create scrim failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function listScrimsHandler(req, res) {
  const teamId = req.query.teamId ? Number(req.query.teamId) : null;
  const status = req.query.status ? String(req.query.status) : null;

  if (teamId !== null && !Number.isInteger(teamId)) {
    return res.status(400).json({ message: "teamId must be an integer." });
  }

  if (status !== null && !SCRIM_STATUSES.includes(status)) {
    return res.status(400).json({ message: "status must be pending, confirmed, or canceled." });
  }

  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      `SELECT id, team1_id, team2_id, scheduled_at, status
       FROM scrims
       WHERE ($1::INT IS NULL OR team1_id = $1 OR team2_id = $1)
         AND ($2::TEXT IS NULL OR status = $2)
       ORDER BY scheduled_at ASC`,
      [teamId, status],
    );

    return res.status(200).json({ scrims: result.rows.map(toScrimDto) });
  } catch (error) {
    console.error("List scrims failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function updateScrimHandler(req, res) {
  const scrimId = Number(req.params.scrimId);
  const { team1Id, team2Id, scheduledAt, status } = req.body ?? {};

  if (!Number.isInteger(scrimId)) {
    return res.status(400).json({ message: "scrimId must be an integer." });
  }

  if (
    team1Id === undefined &&
    team2Id === undefined &&
    scheduledAt === undefined &&
    status === undefined
  ) {
    return res.status(400).json({ message: "At least one field is required." });
  }

  if (team1Id !== undefined && !Number.isInteger(team1Id)) {
    return res.status(400).json({ message: "team1Id must be an integer." });
  }

  if (team2Id !== undefined && !Number.isInteger(team2Id)) {
    return res.status(400).json({ message: "team2Id must be an integer." });
  }

  if (team1Id !== undefined && team2Id !== undefined && team1Id === team2Id) {
    return res.status(400).json({ message: "team IDs must differ." });
  }

  if (scheduledAt !== undefined && !isValidIsoDate(scheduledAt)) {
    return res.status(400).json({ message: "scheduledAt must be a valid date string." });
  }

  if (status !== undefined && !SCRIM_STATUSES.includes(status)) {
    return res.status(400).json({ message: "status must be pending, confirmed, or canceled." });
  }

  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      `UPDATE scrims
       SET team1_id = COALESCE($2, team1_id),
           team2_id = COALESCE($3, team2_id),
           scheduled_at = COALESCE($4, scheduled_at),
           status = COALESCE($5, status)
       WHERE id = $1
       RETURNING id, team1_id, team2_id, scheduled_at, status`,
      [scrimId, team1Id ?? null, team2Id ?? null, scheduledAt ?? null, status ?? null],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Scrim not found." });
    }

    return res.status(200).json({ scrim: toScrimDto(result.rows[0]) });
  } catch (error) {
    console.error("Update scrim failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function confirmScrimHandler(req, res) {
  const scrimId = Number(req.params.scrimId);
  if (!Number.isInteger(scrimId)) {
    return res.status(400).json({ message: "scrimId must be an integer." });
  }

  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      `UPDATE scrims
       SET status = 'confirmed'
       WHERE id = $1
       RETURNING id, team1_id, team2_id, scheduled_at, status`,
      [scrimId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Scrim not found." });
    }

    return res.status(200).json({ scrim: toScrimDto(result.rows[0]) });
  } catch (error) {
    console.error("Confirm scrim failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}
