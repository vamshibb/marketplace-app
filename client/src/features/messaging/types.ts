import type { UserSummary } from "../auth";

export interface Conversation {
  id: string;
  product: { id: string; title: string } | null;
  participants: UserSummary[];
  lastMessageAt: string;
  createdAt: string;
}

export interface ConversationListItem extends Pick<Conversation, "id" | "product" | "lastMessageAt"> {
  otherParticipant: UserSummary | null;
  lastMessage: Pick<Message, "id" | "content" | "createdAt"> | null;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: UserSummary;
}
