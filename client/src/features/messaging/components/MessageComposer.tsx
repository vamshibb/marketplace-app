import type { ReactElement } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../../../shared/ui/Button";
import { useSendMessageMutation } from "../hooks/useSendMessageMutation";
import { messageSchema, type MessageFormValues } from "../schemas/messageSchema";

export const MessageComposer = ({ conversationId, userId }: { conversationId: string; userId: string }): ReactElement => {
  const mutation = useSendMessageMutation(conversationId, userId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema), defaultValues: { content: "" },
  });
  return <form noValidate className="space-y-3 border-t border-slate-200 pt-4"
    onSubmit={handleSubmit((values) => {
      if (!mutation.isPending) mutation.mutate(values, { onSuccess: () => reset() });
    })}>
    <label htmlFor="message-content" className="block text-sm font-medium text-slate-700">Message</label>
    <textarea id="message-content" rows={3} maxLength={5000} disabled={mutation.isPending}
      className="w-full rounded-lg border border-slate-300 p-3 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60"
      aria-invalid={Boolean(errors.content)} aria-describedby={errors.content ? "message-error" : undefined}
      {...register("content")} />
    {errors.content && <p id="message-error" role="alert" className="text-sm text-red-600">{errors.content.message}</p>}
    {mutation.isError && <p role="alert" className="text-sm text-red-600">Unable to send message. Your draft is saved; please try again.</p>}
    <Button type="submit" isLoading={mutation.isPending}>Send</Button>
  </form>;
};
