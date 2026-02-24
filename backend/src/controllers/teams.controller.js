import {
  hasAnyManagementAccess,
  hasAnyMembership,
  hasMembershipOnTeam,
  hasRoleOnTeam,
  hasTeamAdminAccess,
  hasTeamManagementAccess,
  countRoleOnTeam,
} from "../services/permissions.service.js";

const TEAM_ROLES = ["player", "sub", "coach", "manager", "admin"];
const ELEVATED_ROLES = ["manager", "admin"];
const TEAM_VISIBILITIES = ["public", "private"];

function toTeamDto(teamRow) {
  return {
    id: teamRow.id,
    name: teamRow.name,
    titleId: teamRow.title_id,
    visibility: teamRow.visibility,
  };
}

function toMembershipDto(membershipRow) {
  return {
    teamId: membershipRow.team_id,
    accountId: membershipRow.account_id,
    role: membershipRow.role,
  };
}

export async function listMyTeamsHandler(req, res) {
  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      `SELECT t.id, t.name, t.title_id, t.visibility
       FROM teams t
       JOIN team_memberships tm ON tm.team_id = t.id
       WHERE tm.account_id = $1
       ORDER BY t.id ASC`,
      [req.auth.accountId],
    );

    return res.status(200).json({
      teams: result.rows.map(toTeamDto),
    });
  } catch (error) {
    console.error("List my teams failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function searchPublicTeamsHandler(req, res) {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      `SELECT id, name, title_id, visibility
       FROM teams
       WHERE visibility = 'public'
         AND ($1::text = '' OR name ILIKE ('%' || $1 || '%'))
       ORDER BY name ASC
       LIMIT 25`,
      [query],
    );

    return res.status(200).json({
      teams: result.rows.map(toTeamDto),
    });
  } catch (error) {
    console.error("Search public teams failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function createTeamHandler(req, res) {
  const { name, titleId, visibility } = req.body ?? {};
  const effectiveVisibility = visibility ?? "private";

  if (typeof name !== "string" || name.trim().length === 0 || !Number.isInteger(titleId)) {
    return res.status(400).json({ message: "name and titleId are required." });
  }

  if (!TEAM_VISIBILITIES.includes(effectiveVisibility)) {
    return res.status(400).json({ message: "visibility must be public or private." });
  }

  try {
    const db = req.app.locals.pool;
    const alreadyOnTeam = await hasAnyMembership(db, req.auth.accountId);

    if (alreadyOnTeam) {
      const canCreate = await hasAnyManagementAccess(db, req.auth.accountId);
      if (!canCreate) {
        return res.status(403).json({
          message: "Only team owners/managers can create teams.",
        });
      }
    }

    const teamResult = await db.query(
      `INSERT INTO teams (name, title_id, visibility)
       VALUES ($1, $2, $3)
       RETURNING id, name, title_id, visibility`,
      [name.trim(), titleId, effectiveVisibility],
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
      "SELECT id, name, title_id, visibility FROM teams WHERE id = $1",
      [teamId],
    );

    if (teamResult.rowCount === 0) {
      return res.status(404).json({ message: "Team not found." });
    }

    const team = teamResult.rows[0];
    if (team.visibility === "private") {
      const isMember = await hasMembershipOnTeam(db, req.auth.accountId, teamId);
      if (!isMember) {
        return res.status(403).json({ message: "This team is private." });
      }
    }

    const membersResult = await db.query(
      "SELECT account_id, team_id, role FROM team_memberships WHERE team_id = $1 ORDER BY account_id",
      [teamId],
    );

    return res.status(200).json({
      team: toTeamDto(team),
      members: membersResult.rows.map(toMembershipDto),
    });
  } catch (error) {
    console.error("Get team failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function updateTeamHandler(req, res) {
  const teamId = Number(req.params.teamId);
  const { name, titleId, visibility } = req.body ?? {};

  if (!Number.isInteger(teamId)) {
    return res.status(400).json({ message: "teamId must be an integer." });
  }

  if (name === undefined && titleId === undefined && visibility === undefined) {
    return res.status(400).json({ message: "At least one field is required." });
  }

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    return res.status(400).json({ message: "name must be a non-empty string." });
  }

  if (titleId !== undefined && !Number.isInteger(titleId)) {
    return res.status(400).json({ message: "titleId must be an integer." });
  }

  if (visibility !== undefined && !TEAM_VISIBILITIES.includes(visibility)) {
    return res.status(400).json({ message: "visibility must be public or private." });
  }

  try {
    const db = req.app.locals.pool;
    const canManage = await hasTeamManagementAccess(db, req.auth.accountId, teamId);
    if (!canManage) {
      return res.status(403).json({
        message: "Only team owners/managers can update team settings.",
      });
    }

    const result = await db.query(
      `UPDATE teams
       SET name = COALESCE($2, name),
           title_id = COALESCE($3, title_id),
           visibility = COALESCE($4, visibility)
       WHERE id = $1
       RETURNING id, name, title_id, visibility`,
      [teamId, name?.trim() ?? null, titleId ?? null, visibility ?? null],
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
    const isAdmin = await hasTeamAdminAccess(db, req.auth.accountId, teamId);
    if (!isAdmin) {
      return res.status(403).json({
        message: "Only team admins can delete teams.",
      });
    }

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
    const canManage = await hasTeamManagementAccess(db, req.auth.accountId, teamId);
    if (!canManage) {
      return res.status(403).json({
        message: "Only team owners/managers can add or invite players.",
      });
    }

    if (ELEVATED_ROLES.includes(role)) {
      const isAdmin = await hasTeamAdminAccess(db, req.auth.accountId, teamId);
      if (!isAdmin) {
        return res.status(403).json({
          message: "Only team admins can assign manager/admin roles.",
        });
      }
    }

    const existingMembershipResult = await db.query(
      `SELECT role
       FROM team_memberships
       WHERE account_id = $1 AND team_id = $2
       LIMIT 1`,
      [accountId, teamId],
    );

    if (existingMembershipResult.rowCount > 0) {
      return res.status(409).json({
        message: "Member already exists on this team. Use role update endpoint.",
      });
    }

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

export async function updateTeamMemberRoleHandler(req, res) {
  const teamId = Number(req.params.teamId);
  const accountId = Number(req.params.accountId);
  const { role } = req.body ?? {};

  if (!Number.isInteger(teamId) || !Number.isInteger(accountId) || !TEAM_ROLES.includes(role)) {
    return res.status(400).json({ message: "teamId, accountId, and valid role are required." });
  }

  try {
    const db = req.app.locals.pool;
    const canManage = await hasTeamManagementAccess(db, req.auth.accountId, teamId);
    if (!canManage) {
      return res.status(403).json({
        message: "Only team owners/managers can update member roles.",
      });
    }

    const existingResult = await db.query(
      `SELECT account_id, team_id, role
       FROM team_memberships
       WHERE team_id = $1 AND account_id = $2
       LIMIT 1`,
      [teamId, accountId],
    );

    if (existingResult.rowCount === 0) {
      return res.status(404).json({ message: "Membership not found." });
    }

    const currentRole = existingResult.rows[0].role;
    const roleChangeTouchesElevated =
      ELEVATED_ROLES.includes(currentRole) || ELEVATED_ROLES.includes(role);

    if (roleChangeTouchesElevated) {
      const isAdmin = await hasTeamAdminAccess(db, req.auth.accountId, teamId);
      if (!isAdmin) {
        return res.status(403).json({
          message: "Only team admins can assign or remove manager/admin roles.",
        });
      }
    }

    if (currentRole === "admin" && role !== "admin") {
      const adminCount = await countRoleOnTeam(db, teamId, "admin");
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot remove the last team admin.",
        });
      }
    }

    const result = await db.query(
      `UPDATE team_memberships
       SET role = $3
       WHERE team_id = $1 AND account_id = $2
       RETURNING account_id, team_id, role`,
      [teamId, accountId, role],
    );

    return res.status(200).json({ membership: toMembershipDto(result.rows[0]) });
  } catch (error) {
    console.error("Update team member role failed:", error);
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
    const canManage = await hasTeamManagementAccess(db, req.auth.accountId, teamId);
    if (!canManage) {
      return res.status(403).json({
        message: "Only team owners/managers can remove players.",
      });
    }

    const targetIsManager = await hasRoleOnTeam(db, accountId, teamId, "manager");
    const targetIsAdmin = await hasRoleOnTeam(db, accountId, teamId, "admin");
    const targetHasElevatedRole = targetIsManager || targetIsAdmin;

    if (targetHasElevatedRole) {
      const isAdmin = await hasTeamAdminAccess(db, req.auth.accountId, teamId);
      if (!isAdmin) {
        return res.status(403).json({
          message: "Only team admins can remove manager/admin roles.",
        });
      }
    }

    if (targetIsAdmin) {
      const adminCount = await countRoleOnTeam(db, teamId, "admin");
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot remove the last team admin.",
        });
      }
    }

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

export async function leaveTeamHandler(req, res) {
  const teamId = Number(req.params.teamId);

  if (!Number.isInteger(teamId)) {
    return res.status(400).json({ message: "teamId must be an integer." });
  }

  try {
    const db = req.app.locals.pool;
    const isMember = await hasMembershipOnTeam(db, req.auth.accountId, teamId);
    if (!isMember) {
      return res.status(404).json({ message: "Membership not found." });
    }

    const isAdmin = await hasRoleOnTeam(db, req.auth.accountId, teamId, "admin");
    if (isAdmin) {
      const adminCount = await countRoleOnTeam(db, teamId, "admin");
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot leave team as the last team admin.",
        });
      }
    }

    await db.query(
      `DELETE FROM team_memberships
       WHERE team_id = $1 AND account_id = $2`,
      [teamId, req.auth.accountId],
    );

    return res.status(200).json({ message: "You left the team." });
  } catch (error) {
    console.error("Leave team failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}
