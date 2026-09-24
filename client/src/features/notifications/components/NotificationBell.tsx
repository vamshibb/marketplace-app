import { Bell } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationsQuery, useUnreadCountQuery } from "../hooks/useNotificationQueries";
import { useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from "../hooks/useNotificationMutations";
import type { Notification } from "../types";

export const NotificationBell = ({ userId }: { userId: string }) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const navigate = useNavigate();
  const count = useUnreadCountQuery(userId);
  const list = useNotificationsQuery(userId, open);
  const markRead = useMarkNotificationReadMutation(userId);
  const markAll = useMarkAllNotificationsReadMutation(userId);
  const pending = markRead.isPending || markAll.isPending;
  const unread = count.data ?? 0;

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const select = async (notification: Notification) => {
    try {
      if (!notification.isRead) await markRead.mutateAsync(notification.id);
      const conversationId = notification.metadata?.conversationId;
      if (notification.type === "MESSAGE" && typeof conversationId === "string" && conversationId.trim()) {
        setOpen(false);
        navigate(`/messages/${encodeURIComponent(conversationId)}`);
      }
    } catch {
      // Mutation error is displayed in the panel; keep it open for retry.
    }
  };

  return (
    <div ref={root} className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}>
      <button ref={trigger} type="button" disabled={!userId}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open} aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (!open) {
            markRead.reset();
            markAll.reset();
            void count.refetch();
          }
          setOpen(!open);
        }}
        className="relative flex size-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 && <span aria-hidden="true" className="absolute -top-1 -right-1 min-w-4 rounded-full bg-blue-600 px-1 text-center text-[10px] font-semibold leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <section id={panelId} aria-label="Notifications"
          className="fixed inset-x-4 top-17 z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-96">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-3">
            <h2 className="font-semibold text-slate-900">Notifications</h2>
            {unread > 0 && <button type="button" disabled={pending} onClick={() => markAll.mutate()}
              className="rounded text-xs font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
              {markAll.isPending ? "Marking..." : "Mark all as read"}
            </button>}
          </div>
          {(markRead.isError || markAll.isError) && <p role="alert" className="px-3 py-2 text-sm text-red-600">Unable to mark notifications as read. Please try again.</p>}
          {count.isError && <p role="alert" className="px-3 py-2 text-sm text-red-600">Unable to load unread count. <button type="button" onClick={() => void count.refetch()} className="underline">Retry</button></p>}
          <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
            {list.isPending ? <p role="status" className="p-4 text-sm text-slate-500">Loading notifications...</p>
              : list.isError ? <div role="alert" className="p-4 text-sm text-red-600">Unable to load notifications. <button type="button" onClick={() => void list.refetch()} className="underline">Retry</button></div>
              : list.data.length === 0 ? <p className="p-4 text-sm text-slate-500">No notifications yet.</p>
              : <ul className="divide-y divide-slate-100">
                {list.data.map((notification) => (
                  <li key={notification.id}>
                    <button type="button" disabled={pending} onClick={() => void select(notification)}
                      className={`block w-full space-y-1 p-3 text-left hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600 disabled:opacity-60 ${notification.isRead ? "bg-white" : "bg-blue-50/70"}`}>
                      <span className="flex items-center gap-2">
                        {!notification.isRead && <span className="size-2 shrink-0 rounded-full bg-blue-600"><span className="sr-only">Unread</span></span>}
                        <span className="text-sm font-semibold text-slate-900">{notification.title}</span>
                      </span>
                      {notification.sender && <span className="block text-xs font-medium text-slate-600">{notification.sender.displayName ?? notification.sender.email}</span>}
                      {notification.body && <span className="block text-sm wrap-anywhere text-slate-600">{notification.body}</span>}
                      <time dateTime={notification.createdAt} className="block text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</time>
                    </button>
                  </li>
                ))}
              </ul>}
          </div>
        </section>
      )}
    </div>
  );
};

