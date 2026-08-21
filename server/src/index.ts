import express from "express";
import cors from "cors";
import categoryRoutes from "./routes/category.routes";
import { env } from "./config/env";

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
import productMediaRoutes
  from "./routes/productMedia.routes";
import conversationRoutes
  from "./routes/conversation.routes";
import messageRoutes
  from "./routes/message.routes";
import notificationRoutes
  from "./routes/notification.routes";

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
app.use("/api/products", productMediaRoutes);
app.use("/api", conversationRoutes);
app.use("/api", messageRoutes);
app.use("/api", notificationRoutes);
app.use(errorMiddleware);

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});
