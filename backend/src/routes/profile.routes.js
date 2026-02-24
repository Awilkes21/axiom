import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  deleteProfileHandler,
  getProfileHandler,
  patchProfileHandler,
} from "../controllers/profile.controller.js";

const router = Router();

router.get("/profile", requireAuth, getProfileHandler);
router.patch("/profile", requireAuth, patchProfileHandler);
router.delete("/profile", requireAuth, deleteProfileHandler);

export default router;
