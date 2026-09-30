import { Router } from "express";
import { getReceivedUserReviews } from "../controllers/userReview.controller";
import { validate } from "../middleware/validationMiddleware";
import { userIdParamSchema } from "../validators/commonValidators";

const router = Router();

router.get("/:userId/reviews", validate(userIdParamSchema, "params"), getReceivedUserReviews);

export default router;
