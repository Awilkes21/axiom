import { Router } from "express";
import { listGameRolesHandler, listGamesHandler } from "../controllers/games.controller.js";

const router = Router();

router.get("/games", listGamesHandler);
router.get("/games/:gameId/roles", listGameRolesHandler);

export default router;
