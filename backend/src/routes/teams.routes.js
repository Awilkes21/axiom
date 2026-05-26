import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  addTeamMemberHandler,
  createTeamHandler,
  createTeamInvitationHandler,
  deleteTeamHandler,
  getTeamHandler,
  leaveTeamHandler,
  listMyTeamInvitationsHandler,
  listMyTeamsHandler,
  removeTeamMemberHandler,
  respondToTeamInvitationHandler,
  searchAccountsHandler,
  searchPublicTeamsHandler,
  updateTeamMemberRoleHandler,
  updateTeamHandler,
} from "../controllers/teams.controller.js";
import {
  getTeamAvailabilityHandler,
  getTeamCalendarScrimsHandler,
  updateTeamAvailabilityHandler,
} from "../controllers/calendar.controller.js";

const router = Router();

router.post("/teams", requireAuth, createTeamHandler);
router.get("/teams", requireAuth, listMyTeamsHandler);
router.get("/team-invitations", requireAuth, listMyTeamInvitationsHandler);
router.post("/team-invitations/:invitationId/respond", requireAuth, respondToTeamInvitationHandler);
router.get("/accounts/search", requireAuth, searchAccountsHandler);
router.get("/teams/search", requireAuth, searchPublicTeamsHandler);
router.get("/teams/:teamId", requireAuth, getTeamHandler);
router.patch("/teams/:teamId", requireAuth, updateTeamHandler);
router.delete("/teams/:teamId", requireAuth, deleteTeamHandler);
router.get("/teams/:teamId/scrims", requireAuth, getTeamCalendarScrimsHandler);
router.get("/teams/:teamId/availability", requireAuth, getTeamAvailabilityHandler);
router.put("/teams/:teamId/availability", requireAuth, updateTeamAvailabilityHandler);
router.post("/teams/:teamId/members", requireAuth, addTeamMemberHandler);
router.post("/teams/:teamId/invitations", requireAuth, createTeamInvitationHandler);
router.patch("/teams/:teamId/members/:accountId/role", requireAuth, updateTeamMemberRoleHandler);
router.delete("/teams/:teamId/members/:accountId", requireAuth, removeTeamMemberHandler);
router.post("/teams/:teamId/leave", requireAuth, leaveTeamHandler);

export default router;
