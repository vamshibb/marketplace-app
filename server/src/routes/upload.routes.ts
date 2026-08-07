import { Router } from "express";

import { upload } from "../middleware/upload.middleware";
import { uploadProductImage } from "../controllers/upload.controller";

const router = Router();

router.post(
  "/",
  upload.single("image"),
  uploadProductImage
);

export default router;