interface MessageSource {
  id: string;
  content: string;
  createdAt: Date;
}

interface MessageSenderSource {
  id: string;
  email: string;
}

export interface MessageDTO {
  id: string;
  content: string;
  createdAt: Date;
  sender: MessageSenderSource;
}

export const toMessageDTO = (
  message: MessageSource,
  sender: MessageSenderSource
): MessageDTO => ({
  id: message.id,
  content: message.content,
  createdAt: message.createdAt,
  sender,
});
