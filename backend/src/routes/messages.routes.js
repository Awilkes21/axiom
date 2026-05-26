import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createConversationHandler,
  createConversationMessageHandler,
  listConversationMessagesHandler,
  listConversationsHandler,
} from "../controllers/messages.controller.js";

const router = Router();

router.get("/conversations", requireAuth, listConversationsHandler);
router.post("/conversations", requireAuth, createConversationHandler);
router.get("/conversations/:conversationId/messages", requireAuth, listConversationMessagesHandler);
router.post("/conversations/:conversationId/messages", requireAuth, createConversationMessageHandler);

export default router;
