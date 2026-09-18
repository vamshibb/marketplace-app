import { z } from "zod";

export const messageSchema = z.object({
  content: z.string().trim().min(1, "Enter a message.").max(5000, "Use no more than 5,000 characters."),
});
export type MessageFormValues = z.infer<typeof messageSchema>;
