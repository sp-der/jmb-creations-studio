import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, MessageCircleMore, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { orderCommunication, orderDate, type OrderMessage } from "@/lib/order-communications";
export function OrderConversation({
  orderId,
  token = "",
  admin = false,
  onRead,
}: {
  orderId: string;
  token?: string;
  admin?: boolean;
  onRead?: (() => void) | undefined;
}) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const request = useRef<{ id: string; body: string } | null>(null);
  const readCallback = useRef(onRead);
  readCallback.current = onRead;
  const list = useRef<HTMLDivElement>(null);
  const refresh = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    let active = true;
    let inFlight = false;
    setMessages([]);
    setDraft("");
    setError("");
    setLoading(true);
    request.current = null;
    async function load() {
      if (!active || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const rows: OrderMessage[] = [];
        for (let offset = 0; offset <= 100000; offset += 200) {
          const result = await orderCommunication<{ messages: OrderMessage[] }>(
            "list",
            { orderId, token, offset },
            admin,
          );
          if (!active) return;
          rows.push(...result.messages);
          if (result.messages.length < 200) break;
        }
        if (!active) return;
        setMessages(rows);
        setError("");
        const unread = rows.filter(
          (m) =>
            m.sender !== (admin ? "admin" : "customer") &&
            !(admin ? m.admin_seen_at : m.customer_seen_at),
        );
        // Only acknowledge messages actually fetched and displayed.
        await orderCommunication(
          "seen",
          { orderId, token, messageIds: unread.map((m) => m.id) },
          admin,
        );
        if (active) readCallback.current?.();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load conversation.");
      } finally {
        if (active) setLoading(false);
        inFlight = false;
      }
    }
    refresh.current = load;
    void load();
    const interval = window.setInterval(() => void load(), 5000);
    const visible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [orderId, token, admin]);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages.length]);
  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    if (!request.current || request.current.body !== body)
      request.current = { id: crypto.randomUUID(), body };
    setBusy(true);
    try {
      await orderCommunication(
        "send",
        { orderId, token, message: body, requestId: request.current.id },
        admin,
      );
      setDraft("");
      request.current = null;
      await refresh.current();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send. Retry your message.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="mt-6 overflow-hidden rounded-3xl border border-border bg-card"
      aria-label="Order conversation"
    >
      <header className="flex items-center gap-3 border-b border-border bg-secondary/30 p-5">
        <MessageCircleMore className="text-primary" />
        <div>
          <h3 className="font-bold">Order Conversation</h3>
          <p className="text-xs text-muted-foreground">
            Messages stay with this order. Replies also send an email notification.
          </p>
        </div>
      </header>
      <div
        ref={list}
        className="max-h-[460px] min-h-[200px] space-y-3 overflow-y-auto bg-secondary/10 p-4"
        aria-live="polite"
        aria-busy={loading}
      >
        {loading && <p className="text-sm text-muted-foreground">Loading conversation…</p>}
        {!loading && !messages.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Start a conversation about this order.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender === (admin ? "admin" : "customer") ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl p-4 text-sm ${m.sender === "admin" ? "bg-gradient-plum text-primary-foreground" : "border border-border bg-card"}`}
            >
              <p className="mb-1 text-xs font-bold">{m.sender_name}</p>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.body}</p>
              <p className="mt-2 text-[10px] opacity-75">{orderDate(m.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <form onSubmit={(e) => void send(e)} className="space-y-3 border-t border-border p-4">
        <label className="sr-only" htmlFor={`message-${orderId}`}>
          Message about this order
        </label>
        <Textarea
          id={`message-${orderId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={4000}
          disabled={busy}
          placeholder={admin ? "Reply to customer…" : "Message JMB…"}
          rows={3}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{draft.length}/4,000</span>
          <Button type="submit" variant="hero" disabled={busy || loading || !draft.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Send />} Send Message
          </Button>
        </div>
      </form>
    </section>
  );
}
