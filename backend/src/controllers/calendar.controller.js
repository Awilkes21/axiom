import { hasMembershipOnTeam } from "../services/permissions.service.js";

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
