import { useQuery } from "@tanstack/react-query";
import { getConversation } from "../api/messagingApi";
import { messagingQueryKeys } from "../queryKeys";

export const useConversationQuery = (id: string, userId?: string) => useQuery({
  queryKey: messagingQueryKeys.conversation(userId, id),
  queryFn: ({ signal }) => getConversation(id, signal),
  enabled: Boolean(id && userId),
});
