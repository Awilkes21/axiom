import {
  getRolesForGameSlug,
  slugifyGameName,
} from "../services/game-roles.service.js";

function toGameDto(titleRow) {
  return {
    id: titleRow.id,
    slug: slugifyGameName(titleRow.name),
    name: titleRow.name,
    shortName: titleRow.short_name,
  };
}

export async function listGamesHandler(req, res) {
  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      "SELECT id, name, short_name FROM titles ORDER BY name ASC",
    );

    return res.status(200).json({
      games: result.rows.map(toGameDto),
    });
  } catch (error) {
    console.error("List games failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export async function listGameRolesHandler(req, res) {
  const gameSlug = String(req.params.gameId || "").trim().toLowerCase();

  if (!gameSlug) {
    return res.status(400).json({ message: "gameId is required." });
  }

  try {
    const db = req.app.locals.pool;
    const result = await db.query(
      "SELECT id, name, short_name FROM titles ORDER BY name ASC",
    );

    const game = result.rows
      .map(toGameDto)
      .find((candidate) => candidate.slug === gameSlug);

    if (!game) {
      return res.status(404).json({ message: "Game not found." });
    }

    return res.status(200).json({
      game,
      roles: getRolesForGameSlug(game.slug),
    });
  } catch (error) {
    console.error("List game roles failed:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}
