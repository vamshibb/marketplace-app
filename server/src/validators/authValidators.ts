import { z } from "zod";

export const registerSchema =
  z.object({
    displayName: z.string().trim().min(1).max(100),
    email: z.email(),
    password: z.string().min(6),
  });

export const loginSchema =
  z.object({
    email: z.email(),
    password: z.string().min(6),
  });
