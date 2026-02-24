import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  addTeamMemberHandler,
  createTeamHandler,
  deleteTeamHandler,
  getTeamHandler,
  removeTeamMemberHandler,
  updateTeamHandler,
} from "../controllers/teams.controller.js";

const router = Router();

router.post("/teams", requireAuth, createTeamHandler);
router.get("/teams/:teamId", requireAuth, getTeamHandler);
router.patch("/teams/:teamId", requireAuth, updateTeamHandler);
router.delete("/teams/:teamId", requireAuth, deleteTeamHandler);
router.post("/teams/:teamId/members", requireAuth, addTeamMemberHandler);
router.delete("/teams/:teamId/members/:accountId", requireAuth, removeTeamMemberHandler);

export default router;
