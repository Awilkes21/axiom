import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  cancelScrimHandler,
  confirmScrimHandler,
  createScrimHandler,
  listScrimsHandler,
  updateScrimHandler,
} from "../controllers/scrims.controller.js";

const router = Router();

router.post("/scrims", requireAuth, createScrimHandler);
router.get("/scrims", requireAuth, listScrimsHandler);
router.patch("/scrims/:scrimId", requireAuth, updateScrimHandler);
router.post("/scrims/:scrimId/confirm", requireAuth, confirmScrimHandler);
router.post("/scrims/:scrimId/cancel", requireAuth, cancelScrimHandler);

export default router;
