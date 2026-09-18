import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessage } from "../api/messagingApi";
import { messagingQueryKeys } from "../queryKeys";
import type { MessageFormValues } from "../schemas/messageSchema";
import type { Message } from "../types";

export const useSendMessageMutation = (id: string, userId: string) => {
  const queryClient = useQueryClient();
  const queryKey = messagingQueryKeys.messages(userId, id);
  return useMutation({
    mutationFn: (values: MessageFormValues) => sendMessage(id, values),
    onSuccess: async (message) => {
      await queryClient.cancelQueries({ queryKey, exact: true });
      queryClient.setQueryData<Message[]>(queryKey, (messages = []) =>
        [...messages.filter((item) => item.id !== message.id), message]);
      void queryClient.invalidateQueries({ queryKey, exact: true });
    },
  });
};
