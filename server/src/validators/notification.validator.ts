import { z } from "zod";

export const markNotificationAsReadParamsSchema = z.object({
  notificationId: z.string().trim().min(1),
});
