import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import categoryRoutes from "./routes/category.routes";

import authRoutes from "./routes/auth.routes";
import {
  authMiddleware,
} from "./middleware/authMiddleware";
import productRoutes from "./routes/product.routes";
import { errorMiddleware } from "./middleware/errorMiddleware";
import favoriteRoutes
  from "./routes/favorite.routes";
import reviewRoutes
  from "./routes/review.routes";
import uploadRoutes from "./routes/upload.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get(
  "/api/protected",
  authMiddleware,
  (req, res) => {
    res.json({
      message: "Protected route works",
    });
  }
);



app.get("/", (_, res) => {
  res.json({
    message: "Marketplace API running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/uploads", uploadRoutes);
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});