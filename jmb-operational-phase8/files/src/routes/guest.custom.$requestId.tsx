import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole, Send } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchGuestWorkspace,
  requestCode,
  sendGuestMessage,
  type CustomMessage,
  type CustomRequest,
} from "@/lib/custom-requests";

export const Route = createFileRoute("/guest/custom/$requestId")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({ meta: [{ title: "Private Custom Request | JMB 2 Creations" }] }),
  component: GuestCustomPage,
});

function GuestCustomPage() {
  const { requestId } = Route.useParams();
  const search = Route.useSearch();
  const storageKey = useMemo(() => `jmb_guest_custom_token:${requestId}`, [requestId]);
  const [effectiveToken, setEffectiveToken] = useState(search.token);
  const [request, setRequest] = useState<CustomRequest | null>(null);
  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = search.token.trim();
    const fromSession = window.sessionStorage.getItem(storageKey)?.trim() ?? "";
    const nextToken = fromUrl || fromSession;
    if (!nextToken) {
      setEffectiveToken("");
      setLoading(false);
      return;
    }
    window.sessionStorage.setItem(storageKey, nextToken);
    setEffectiveToken(nextToken);
    if (!fromUrl) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("token", nextToken);
      window.history.replaceState({}, "", nextUrl.toString());
    }
  }, [search.token, storageKey]);

  async function refresh(token = effectiveToken) {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const workspace = await fetchGuestWorkspace(requestId, token);
      setRequest(workspace.request);
      setMessages(workspace.messages);
      setErrorMessage("");
    } catch (error) {
      setRequest(null);
      setMessages([]);
      setErrorMessage(error instanceof Error ? error.message : "This private link could not be opened.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!effectiveToken) return;
    void refresh(effectiveToken);
    const timer = window.setInterval(() => void refresh(effectiveToken), 5000);
    return () => window.clearInterval(timer);
  }, [requestId, effectiveToken]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim() || !effectiveToken) return;
    const body = message.trim();
    setMessage("");
    try {
      await sendGuestMessage(requestId, effectiveToken, body);
      await refresh(effectiveToken);
    } catch (error) {
      setMessage(body);
      toast.error(error instanceof Error ? error.message : "Message could not be sent.");
    }
  }

  if (loading) {
    return <main className="grid min-h-[70vh] place-items-center"><p className="text-sm text-muted-foreground">Opening your private request...</p></main>;
  }

  if (!effectiveToken || !request) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <LockKeyhole className="mx-auto size-9 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-bold">This private link is invalid or expired.</h1>
        <p className="mt-3 text-muted-foreground">{errorMessage || "Use the exact private link created for this request."}</p>
        <Button variant="outline" className="mt-6" asChild><Link to="/custom-orders"><ArrowLeft /> Back to Custom Orders</Link></Button>
      </main>
    );
  }

  return (
    <main className="min-h-[75vh] bg-[oklch(0.985_0.01_320)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 text-sm shadow-soft">
          <div className="flex gap-3"><LockKeyhole className="size-5 shrink-0 text-primary" /><div><strong>Private guest request</strong><p className="mt-1 text-muted-foreground">Keep this link private. It gives access to your JMB custom-order conversation without a password.</p></div></div>
        </div>
        <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft">
          <header className="border-b border-border bg-secondary/30 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="font-bold text-primary">{requestCode(request)}</p><h1 className="mt-1 font-display text-3xl font-bold">{request.product_family}</h1><p className="mt-2 text-sm text-muted-foreground">{request.customer_name} • {request.customer_email}</p></div>
              <div className="text-right"><span className="rounded-full bg-card px-3 py-1 text-xs font-bold text-primary">{request.status}</span>{request.quote != null && <p className="mt-3 font-display text-xl font-bold">Quote ${Number(request.quote).toFixed(2)}</p>}</div>
            </div>
          </header>
          <div className="grid gap-3 border-b border-border p-5 text-sm sm:grid-cols-3"><div><span className="text-muted-foreground">Colors/theme</span><p className="font-bold">{request.colors || "Not specified"}</p></div><div><span className="text-muted-foreground">Size</span><p className="font-bold">{request.size || "Not specified"}</p></div><div><span className="text-muted-foreground">Quantity</span><p className="font-bold">{request.quantity}</p></div></div>
          <div className="max-h-[560px] min-h-[380px] space-y-3 overflow-y-auto bg-[oklch(0.99_0.008_320)] p-5">
            {messages.map((item) => <div key={item.id} className={`flex ${item.sender === "customer" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${item.sender === "customer" ? "bg-gradient-plum text-primary-foreground" : "border border-border bg-card"}`}><p className="whitespace-pre-wrap">{item.body}</p><p className={`mt-1 text-[10px] ${item.sender === "customer" ? "text-white/70" : "text-muted-foreground"}`}>{new Date(item.created_at).toLocaleString()}</p></div></div>)}
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-border p-4"><Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message JMB 2 Creations..." /><Button type="submit" variant="hero" size="icon" aria-label="Send message"><Send /></Button></form>
        </section>
      </div>
    </main>
  );
}
