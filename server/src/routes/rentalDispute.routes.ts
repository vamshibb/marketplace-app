import { Router } from "express";

import * as rentalDisputeController from "../controllers/rentalDispute.controller";
import { adminMiddleware } from "../middleware/adminMiddleware";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post(
    "/rental-disputes/:disputeId/resolve",
    authMiddleware,
    adminMiddleware,
    rentalDisputeController.resolveDispute
);

export default router;
