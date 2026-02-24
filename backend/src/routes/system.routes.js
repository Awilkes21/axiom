import { Router } from "express";
import { healthHandler, rootHandler } from "../controllers/system.controller.js";

const router = Router();

router.get("/", rootHandler);
router.get("/health", healthHandler);

export default router;
