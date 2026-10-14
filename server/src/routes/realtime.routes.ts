import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { streamUserEvents } from "../controllers/realtime.controller";

const router = Router();

// Fetch streaming supports the existing Authorization header; no query token or
// caller-supplied user ID is used to authenticate or scope this connection.
router.get("/realtime/stream", authMiddleware, streamUserEvents);

export default router;
