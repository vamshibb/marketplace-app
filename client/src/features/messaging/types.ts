import type { UserSummary } from "../auth";

export interface Conversation {
  id: string;
  product: { id: string; title: string } | null;
  participants: UserSummary[];
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: UserSummary;
}
