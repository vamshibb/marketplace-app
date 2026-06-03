import { Router } from "express";

import {
  register,
  login,
  me,
} from "../controllers/authController";

import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/test", (_, res) => {
  res.json({
    message: "auth routes working",
  });
});

router.get(
  "/me",
  authMiddleware,
  me
);

export default router;