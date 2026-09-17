import type { UserSummary } from "./user.dto";

interface MessageSource {
  id: string;
  content: string;
  createdAt: Date;
}

export interface MessageDTO {
  id: string;
  content: string;
  createdAt: Date;
  sender: UserSummary;
}

export const toMessageDTO = (
  message: MessageSource,
  sender: UserSummary
): MessageDTO => ({
  id: message.id,
  content: message.content,
  createdAt: message.createdAt,
  sender,
});
