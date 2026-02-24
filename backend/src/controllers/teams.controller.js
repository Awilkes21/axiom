const TEAM_ROLES = ["player", "sub", "coach", "manager", "admin"];

function toTeamDto(teamRow) {
  return {
    id: teamRow.id,
    name: teamRow.name,
    titleId: teamRow.title_id,
  };
}

function toMembershipDto(membershipRow) {
  return {
    teamId: membershipRow.team_id,
    accountId: membershipRow.account_id,
    role: membershipRow.role,
  };
}

export async function createTeamHandler(req, res) {
  const { name, titleId } = req.body ?? {};

  if (typeof name !== "string" || name.trim().length === 0 || !Number.isInteger(titleId)) {
    return res.status(400).json({ message: "name and titleId are required." });
  }

  try {
    const db = req.app.locals.pool;
    const teamResult = await db.query(
      `INSERT INTO teams (name, title_id)
       VALUES ($1, $2)
       RETURNING id, name, title_id`,
      [name.trim(), titleId],
    );

    const team = teamResult.rows[0];
    await db.query(
      `INSERT INTO team_memberships (account_id, team_id, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT DO NOTHING`,
      [req.auth.accountId, team.id],
    );

    return res.status(201).json({ team: toTeamDto(team) });
  } catch (error) {
    console.error("Create team failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function getTeamHandler(req, res) {
  const teamId = Number(req.params.teamId);
  if (!Number.isInteger(teamId)) {
    return res.status(400).json({ message: "teamId must be an integer." });
  }

  try {
    const db = req.app.locals.pool;
    const teamResult = await db.query(
      "SELECT id, name, title_id FROM teams WHERE id = $1",
      [teamId],
    );

    if (teamResult.rowCount === 0) {
      return res.status(404).json({ message: "Team not found." });
    }

    const membersResult = await db.query(
      "SELECT account_id, team_id, role FROM team_memberships WHERE team_id = $1 ORDER BY account_id",
      [teamId],
    );

    return res.status(200).json({
      team: toTeamDto(teamResult.rows[0]),
      members: membersResult.rows.map(toMembershipDto),
    });
  } catch (error) {
    console.error("Get team failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function updateTeamHandler(req, res) {
  const teamId = Number(req.params.teamId);
  const { name, titleId } = req.body ?? {};

  if (!Number.isInteger(teamId)) {
    return res.status(400).json({ message: "teamId must be an integer." });
  }

  if (name === undefined && titleId === undefined) {
    return res.status(400).json({ message: "At least one field is required." });
  }

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return res.status(400).json({ message: "name must be a non-empty string." });
  }

  if (titleId !== undefined && !Number.isInteger(titleId)) {
    return res.status(400).json({ message: "titleId must be an integer." });
  }

  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      `UPDATE teams
       SET name = COALESCE($2, name),
           title_id = COALESCE($3, title_id)
       WHERE id = $1
       RETURNING id, name, title_id`,
      [teamId, name?.trim() ?? null, titleId ?? null],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Team not found." });
    }

    return res.status(200).json({ team: toTeamDto(result.rows[0]) });
  } catch (error) {
    console.error("Update team failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function deleteTeamHandler(req, res) {
  const teamId = Number(req.params.teamId);
  if (!Number.isInteger(teamId)) {
    return res.status(400).json({ message: "teamId must be an integer." });
  }

  try {
    const db = req.app.locals.pool;
    const result = await db.query("DELETE FROM teams WHERE id = $1 RETURNING id", [teamId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Team not found." });
    }

    return res.status(200).json({ message: "Team deleted." });
  } catch (error) {
    console.error("Delete team failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function addTeamMemberHandler(req, res) {
  const teamId = Number(req.params.teamId);
  const { accountId, role } = req.body ?? {};

  if (!Number.isInteger(teamId) || !Number.isInteger(accountId) || !TEAM_ROLES.includes(role)) {
    return res.status(400).json({ message: "teamId, accountId, and valid role are required." });
  }

  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      `INSERT INTO team_memberships (account_id, team_id, role)
       VALUES ($1, $2, $3)
       RETURNING account_id, team_id, role`,
      [accountId, teamId, role],
    );

    return res.status(201).json({ membership: toMembershipDto(result.rows[0]) });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Membership already exists." });
    }

    console.error("Add team member failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function removeTeamMemberHandler(req, res) {
  const teamId = Number(req.params.teamId);
  const accountId = Number(req.params.accountId);

  if (!Number.isInteger(teamId) || !Number.isInteger(accountId)) {
    return res.status(400).json({ message: "teamId and accountId must be integers." });
  }

  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      `DELETE FROM team_memberships
       WHERE team_id = $1 AND account_id = $2
       RETURNING account_id, team_id, role`,
      [teamId, accountId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Membership not found." });
    }

    return res.status(200).json({ message: "Member removed." });
  } catch (error) {
    console.error("Remove team member failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}
