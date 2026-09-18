import { useEffect, useRef, type ReactElement } from "react";
import type { Message } from "../types";

export const MessageList = ({ messages, userId }: { messages: Message[]; userId: string }): ReactElement => {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [messages.length]);
  return <div role="log" aria-label="Message history" aria-live="polite" className="max-h-[50vh] overflow-y-auto py-3">
    {messages.length === 0 ? <p className="py-6 text-center text-slate-500">No messages yet. Start the conversation below.</p> :
      <ol className="space-y-3">{messages.map((message) => <li key={message.id}
        className={`max-w-[90%] rounded-xl p-3 sm:max-w-[75%] ${message.sender.id === userId ? "ml-auto bg-blue-50" : "bg-slate-100"}`}>
        <p className="text-xs font-semibold wrap-anywhere text-slate-600">{message.sender.displayName ?? message.sender.email}</p>
        <p className="mt-1 whitespace-pre-wrap wrap-anywhere text-slate-900">{message.content}</p>
        <time dateTime={message.createdAt} className="mt-2 block text-xs text-slate-500">{new Date(message.createdAt).toLocaleString()}</time>
      </li>)}</ol>}
    <div ref={end} />
  </div>;
};
