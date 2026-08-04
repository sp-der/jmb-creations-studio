import { CheckCheck, ImagePlus, Paperclip, Send, Smile, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addDemoMessage,
  getDemoMessages,
  isRoleTyping,
  markMessagesRead,
  setRoleTyping,
  subscribePresentation,
  type DemoChatMessage,
  type DemoChatRole,
} from "@/lib/presentation-sync";
import { cn } from "@/lib/utils";

type ChatRoomProps = {
  role: DemoChatRole;
  requestId?: string;
  className?: string;
  compact?: boolean;
};

export function ChatRoom({
  role,
  requestId = "REQ-208",
  className,
  compact = false,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<DemoChatMessage[]>(() => getDemoMessages(requestId));
  const [draft, setDraft] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherRole: DemoChatRole = role === "admin" ? "customer" : "admin";

  useEffect(() => {
    const sync = () => {
      setMessages(markMessagesRead(requestId, role));
      setOtherTyping(isRoleTyping(otherRole));
    };

    sync();
    const unsubscribe = subscribePresentation(sync);
    const interval = window.setInterval(sync, 500);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
      setRoleTyping(role, false);
      if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
    };
  }, [otherRole, requestId, role]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages, otherTyping]);

  const lastOwnMessage = useMemo(
    () => [...messages].reverse().find((message) => message.sender === role),
    [messages, role],
  );

  const updateTyping = (value: string) => {
    setDraft(value);
    setRoleTyping(role, value.trim().length > 0);
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
    typingTimeout.current = window.setTimeout(() => setRoleTyping(role, false), 1700);
  };

  const sendMessage = () => {
    if (!draft.trim()) return;
    setMessages(addDemoMessage(requestId, role, draft));
    setDraft("");
    setRoleTyping(role, false);
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
  };

  const attachDemo = (kind: "file" | "image") => {
    toast.success(kind === "image" ? "Reference image attached" : "File attached", {
      description: "Presentation only. Upload storage will be connected later.",
    });
  };

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft",
        compact ? "h-[560px]" : "h-[640px]",
        className,
      )}
      aria-label={`${role === "admin" ? "Admin" : "Customer"} custom request chat`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-secondary/70 to-card px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-plum text-primary-foreground shadow-soft">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold">
                {role === "admin" ? "Priya S." : "JMB 2 Creations"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {otherTyping
                  ? `${role === "admin" ? "Customer" : "JMB 2 Creations"} is typing...`
                  : role === "admin"
                    ? "Custom request customer"
                    : "Usually replies within a few hours"}
              </p>
            </div>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
          {requestId}
        </span>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,oklch(0.98_0.012_340),oklch(0.97_0.018_300))] px-4 py-5 sm:px-6"
        aria-live="polite"
      >
        <div className="mx-auto max-w-md rounded-2xl border border-primary/15 bg-card/90 px-4 py-3 text-center text-xs text-muted-foreground shadow-soft">
          Presentation chat for custom order <strong className="text-foreground">{requestId}</strong>.
          Messages, read receipts and typing indicators sync between open browser tabs.
        </div>

        {messages.map((message) => {
          const mine = message.sender === role;
          const readByOther = role === "admin" ? message.readByCustomer : message.readByAdmin;
          return (
            <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[86%] sm:max-w-[72%]", mine && "text-right")}>
                <div
                  className={cn(
                    "rounded-3xl px-4 py-3 text-left text-sm leading-relaxed shadow-sm",
                    mine
                      ? "rounded-br-md bg-gradient-plum text-primary-foreground"
                      : "rounded-bl-md border border-border bg-card text-foreground",
                  )}
                >
                  {message.text}
                </div>
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1 px-1 text-[11px] text-muted-foreground",
                    mine ? "justify-end" : "justify-start",
                  )}
                >
                  <span>{message.timeLabel}</span>
                  {mine && message.id === lastOwnMessage?.id && (
                    <>
                      <span>•</span>
                      <CheckCheck
                        className={cn("size-3", readByOther ? "text-primary" : "text-muted-foreground")}
                        aria-hidden
                      />
                      <span>{readByOther ? "Read" : "Sent"}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {otherTyping && (
          <div className="flex justify-start">
            <div className="rounded-3xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1" aria-label="Other user is typing">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="size-2 animate-bounce rounded-full bg-primary/60"
                    style={{ animationDelay: `${dot * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card p-3 sm:p-4">
        <div className="flex items-end gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Attach a file"
              onClick={() => attachDemo("file")}
            >
              <Paperclip />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Attach a reference image"
              onClick={() => attachDemo("image")}
            >
              <ImagePlus />
            </Button>
          </div>
          <div className="relative min-w-0 flex-1">
            <label htmlFor={`${role}-${requestId}-message`} className="sr-only">
              Type a message
            </label>
            <Textarea
              id={`${role}-${requestId}-message`}
              value={draft}
              onChange={(event) => updateTyping(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={role === "admin" ? "Reply to Priya..." : "Message JMB 2 Creations..."}
              className="min-h-12 resize-none rounded-2xl pr-11"
              rows={1}
            />
            <Smile className="pointer-events-none absolute bottom-3.5 right-3 size-4 text-muted-foreground" />
          </div>
          <Button
            type="button"
            variant="hero"
            size="icon"
            aria-label="Send message"
            onClick={sendMessage}
            disabled={!draft.trim()}
          >
            <Send />
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Press Enter to send • Shift + Enter for a new line
        </p>
      </div>
    </section>
  );
}
