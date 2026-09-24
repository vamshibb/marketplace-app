import type { UserSummary } from "../auth";

export interface Notification {
  id: string;
  type: "MESSAGE" | "REVIEW" | "FAVORITE" | "ORDER" | "SYSTEM";
  title: string;
  body: string | null;
  sender: UserSummary | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

