interface ProductSummary {
  id: string;
  title: string;
}

interface UserSummary {
  id: string;
  email: string;
}

interface LastMessageSummary {
  id: string;
  content: string;
  createdAt: Date;
}

interface ConversationParticipantSource {
  userId: string;
  user: UserSummary;
}

interface ConversationSource {
  id: string;
  product: ProductSummary | null;
  participants: ConversationParticipantSource[];
  lastMessageAt: Date;
  createdAt: Date;
}

interface ConversationListSource extends ConversationSource {
  messages: LastMessageSummary[];
}

export interface ConversationListDTO {
  id: string;
  product: ProductSummary | null;
  otherParticipant: UserSummary | null;
  lastMessage: LastMessageSummary | null;
  lastMessageAt: Date;
}

export interface ConversationDTO {
  id: string;
  product: ProductSummary | null;
  participants: UserSummary[];
  lastMessageAt: Date;
  createdAt: Date;
}

export const toConversationListDTO = (
  conversation: ConversationListSource,
  currentUserId: string
): ConversationListDTO => ({
  id: conversation.id,
  product: conversation.product,
  otherParticipant:
    conversation.participants.find(
      (participant) => participant.userId !== currentUserId
    )?.user ?? null,
  lastMessage: conversation.messages[0] ?? null,
  lastMessageAt: conversation.lastMessageAt,
});

export const toConversationDTO = (
  conversation: ConversationSource
): ConversationDTO => ({
  id: conversation.id,
  product: conversation.product,
  participants: conversation.participants.map(
    (participant) => participant.user
  ),
  lastMessageAt: conversation.lastMessageAt,
  createdAt: conversation.createdAt,
});
