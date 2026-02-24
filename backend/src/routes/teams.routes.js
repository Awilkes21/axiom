import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  addTeamMemberHandler,
  createTeamHandler,
  deleteTeamHandler,
  getTeamHandler,
  leaveTeamHandler,
  removeTeamMemberHandler,
  updateTeamMemberRoleHandler,
  updateTeamHandler,
} from "../controllers/teams.controller.js";

const router = Router();

router.post("/teams", requireAuth, createTeamHandler);
router.get("/teams/:teamId", requireAuth, getTeamHandler);
router.patch("/teams/:teamId", requireAuth, updateTeamHandler);
router.delete("/teams/:teamId", requireAuth, deleteTeamHandler);
router.post("/teams/:teamId/members", requireAuth, addTeamMemberHandler);
router.patch("/teams/:teamId/members/:accountId/role", requireAuth, updateTeamMemberRoleHandler);
router.delete("/teams/:teamId/members/:accountId", requireAuth, removeTeamMemberHandler);
router.post("/teams/:teamId/leave", requireAuth, leaveTeamHandler);

export default router;
