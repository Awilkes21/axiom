import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createScrimApplicationHandler,
  createScrimPostHandler,
  decideScrimApplicationHandler,
  listScrimPostApplicationsHandler,
  listScrimPostsHandler,
} from "../controllers/scrim-marketplace.controller.js";

const router = Router();

router.post("/scrim-posts", requireAuth, createScrimPostHandler);
router.get("/scrim-posts", requireAuth, listScrimPostsHandler);
router.post("/scrim-posts/:postId/applications", requireAuth, createScrimApplicationHandler);
router.get("/scrim-posts/:postId/applications", requireAuth, listScrimPostApplicationsHandler);
router.patch("/scrim-applications/:applicationId/decision", requireAuth, decideScrimApplicationHandler);

export default router;
