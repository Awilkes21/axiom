const GAME_ROLE_MAP = {
  "valorant": ["duelist", "initiator", "controller", "sentinel"],
  "counter-strike-2": ["entry-fragger", "awper", "rifler", "support", "igl"],
  "league-of-legends": ["top", "jungle", "mid", "adc", "support"],
  "dota-2": ["carry", "mid", "offlane", "soft-support", "hard-support"],
  "overwatch-2": ["tank", "damage", "support"],
  "deadlock": ["carry", "initiator", "support", "flex"],
};

export function slugifyGameName(gameName) {
  return String(gameName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getRolesForGameSlug(gameSlug) {
  return GAME_ROLE_MAP[gameSlug] ?? [];
}
