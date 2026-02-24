export const MANAGEMENT_ROLES = ["admin", "manager"];
export const ADMIN_ROLES = ["admin"];

export async function hasTeamRoleAccess(db, accountId, teamId, roles) {
  const result = await db.query(
    `SELECT 1
     FROM team_memberships
     WHERE account_id = $1
       AND team_id = $2
       AND role = ANY($3::team_role[])
     LIMIT 1`,
    [accountId, teamId, roles],
  );

  return result.rowCount > 0;
}

export async function hasTeamManagementAccess(db, accountId, teamId) {
  return hasTeamRoleAccess(db, accountId, teamId, MANAGEMENT_ROLES);
}

export async function hasTeamAdminAccess(db, accountId, teamId) {
  return hasTeamRoleAccess(db, accountId, teamId, ADMIN_ROLES);
}

export async function hasAnyManagementAccess(db, accountId) {
  const result = await db.query(
    `SELECT 1
     FROM team_memberships
     WHERE account_id = $1
       AND role = ANY($2::team_role[])
     LIMIT 1`,
    [accountId, MANAGEMENT_ROLES],
  );

  return result.rowCount > 0;
}

export async function hasAnyMembership(db, accountId) {
  const result = await db.query(
    `SELECT 1
     FROM team_memberships
     WHERE account_id = $1
     LIMIT 1`,
    [accountId],
  );

  return result.rowCount > 0;
}

export async function hasMembershipOnTeam(db, accountId, teamId) {
  const result = await db.query(
    `SELECT 1
     FROM team_memberships
     WHERE account_id = $1
       AND team_id = $2
     LIMIT 1`,
    [accountId, teamId],
  );

  return result.rowCount > 0;
}

export async function hasRoleOnTeam(db, accountId, teamId, role) {
  const result = await db.query(
    `SELECT 1
     FROM team_memberships
     WHERE account_id = $1
       AND team_id = $2
       AND role = $3::team_role
     LIMIT 1`,
    [accountId, teamId, role],
  );

  return result.rowCount > 0;
}

export async function countRoleOnTeam(db, teamId, role) {
  const result = await db.query(
    `SELECT COUNT(*)::INT AS count
     FROM team_memberships
     WHERE team_id = $1
       AND role = $2::team_role`,
    [teamId, role],
  );

  return result.rows[0]?.count ?? 0;
}
