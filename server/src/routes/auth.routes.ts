import { Router } from "express";

import {
  register,
  login,
  me,
} from "../controllers/auth.controller";

import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validationMiddleware";
import { registerSchema } from "../validators/authValidators";

const router = Router();

router.post("/register", validate(registerSchema), register);
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