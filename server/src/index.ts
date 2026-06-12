import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import categoryRoutes from "./routes/categoryRoutes";

import authRoutes from "./routes/authRoutes";
import {
  authMiddleware,
} from "./middleware/authMiddleware";
import productRoutes from "./routes/productRoutes";
import { errorMiddleware } from "./middleware/errorMiddleware";
import favoriteRoutes
  from "./routes/favoriteRoutes";

dotenv.config();

const app = express();

app.get(
  "/api/protected",
  authMiddleware,
  (req, res) => {
    res.json({
      message: "Protected route works",
    });
  }
);

app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.json({
    message: "Marketplace API running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});