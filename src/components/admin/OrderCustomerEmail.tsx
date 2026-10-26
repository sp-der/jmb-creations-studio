import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mail, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { orderCommunication, orderDate, type Delivery } from "@/lib/order-communications";
export function OrderCustomerEmail({ orderId, email }: { orderId: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const request = useRef<{ id: string; signature: string } | null>(null);
  async function refresh() {
    const result = await orderCommunication<{ notifications: Delivery[] }>(
      "notifications",
      { orderId },
      true,
    );
    setDeliveries(result.notifications);
  }
  useEffect(() => {
    let active = true;
    setFeedback("");
    setOpen(false);
    setSubject("");
    setMessage("");
    request.current = null;
    const load = () => {
      if (!document.hidden)
        orderCommunication<{ notifications: Delivery[] }>("notifications", { orderId }, true)
          .then((r) => {
            if (active) setDeliveries(r.notifications);
          })
          .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [orderId]);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const signature = JSON.stringify([subject.trim(), message.trim()]);
    if (request.current?.signature !== signature)
      request.current = { id: crypto.randomUUID(), signature };
    try {
      await orderCommunication(
        "email",
        {
          orderId,
          subject: subject.trim(),
          message: message.trim(),
          requestId: request.current.id,
        },
        true,
      );
      setMessage("");
      setSubject("");
      request.current = null;
      setFeedback("Email saved to the delivery queue. Check its status below.");
      await refresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not save email. Retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-5 space-y-3 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="soft" onClick={() => setOpen((v) => !v)}>
          <Mail /> Email Customer
        </Button>
        <Button variant="ghost" asChild>
          <a href={`mailto:${email}`}>Open Email App</a>
        </Button>
      </div>
      {open && (
        <form onSubmit={(e) => void send(e)} className="space-y-3">
          <p className="break-all text-xs text-muted-foreground">
            To: {email} · Order reference is included automatically.
          </p>
          <label className="block text-sm font-bold">
            Subject
            <Input
              required
              maxLength={150}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block text-sm font-bold">
            Message
            <Textarea
              required
              maxLength={10000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={busy}
              rows={5}
            />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Send Email"}
          </Button>
        </form>
      )}
      {feedback && (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      )}
      <details>
        <summary className="cursor-pointer text-sm font-bold">Email delivery status</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Sent means accepted by Resend. Inbox delivery must be checked with the provider.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void orderCommunication("retry", {}, true)
              .then(refresh)
              .catch((err) => setFeedback(String(err)));
          }}
        >
          <RefreshCcw /> Retry due emails
        </Button>
        <div className="max-h-56 space-y-2 overflow-auto">
          {!deliveries.length && (
            <p className="text-sm text-muted-foreground">No queued emails for this order.</p>
          )}
          {deliveries.map((d) => (
            <div key={d.id} className="rounded-xl bg-secondary/25 p-3 text-xs">
              <p className="font-bold">
                {d.subject || d.kind.replaceAll("_", " ")} ·{" "}
                {d.state === "sent" ? "Accepted by Resend" : d.state}
              </p>
              <p>
                {orderDate(d.sent_at || d.created_at)} · {d.attempts} attempts
              </p>
              {d.last_error && <p className="mt-1 text-destructive">{d.last_error}</p>}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
