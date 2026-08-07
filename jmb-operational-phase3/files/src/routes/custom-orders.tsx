import { Link, createFileRoute } from "@tanstack/react-router";
import { MessageCircleMore, Plus, Send, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCustomerSession, isCustomerAuthConfigured } from "@/lib/customer-auth";
import {
  createCustomerRequest,
  fetchCustomerRequests,
  fetchMessages,
  requestCode,
  sendMessage,
  type CustomMessage,
  type CustomRequest,
} from "@/lib/custom-requests";

export const Route = createFileRoute("/custom-orders")({
  head: () => ({
    meta: [
      { title: "Custom Orders | JMB 2 Creations" },
      { name: "description", content: "Start and manage a custom creation request with JMB 2 Creations." },
    ],
  }),
  component: CustomOrdersPage,
});

const productOptions = ["Cup Koozies", "Soap Dispensers", "Tap Wands", "Display Shelves", "Cosplay Props", "Something Else"];

function CustomOrdersPage() {
  const session = getCustomerSession();
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => requests.find((item) => item.id === selectedId) ?? null, [requests, selectedId]);

  async function refreshRequests() {
    if (!session) return;
    try {
      const rows = await fetchCustomerRequests();
      setRequests(rows);
      setSelectedId((current) => current ?? rows[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load requests.");
    }
  }

  async function refreshMessages(id: string) {
    try { setMessages(await fetchMessages(id, "customer")); }
    catch { setMessages([]); }
  }

  useEffect(() => { void refreshRequests(); }, []);
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    void refreshMessages(selectedId);
    const timer = window.setInterval(() => void refreshMessages(selectedId), 5000);
    return () => window.clearInterval(timer);
  }, [selectedId]);

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const created = await createCustomerRequest({
        customer_name: String(form.get("name") || "").trim(),
        product_family: String(form.get("product") || "").trim(),
        idea: String(form.get("idea") || "").trim(),
        colors: String(form.get("colors") || "").trim(),
        size: String(form.get("size") || "").trim(),
        quantity: Math.max(1, Number(form.get("quantity") || 1)),
        fulfillment: String(form.get("fulfillment") || "Not sure") as CustomRequest["fulfillment"],
      });
      await sendMessage(created.id, "customer", created.idea);
      await refreshRequests();
      setSelectedId(created.id);
      setShowForm(false);
      toast.success(`${requestCode(created)} created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create request.");
    } finally { setBusy(false); }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !message.trim()) return;
    const body = message.trim();
    setMessage("");
    try {
      await sendMessage(selectedId, "customer", body);
      await refreshMessages(selectedId);
    } catch (error) {
      setMessage(body);
      toast.error(error instanceof Error ? error.message : "Message could not be sent.");
    }
  }

  if (!isCustomerAuthConfigured()) {
    return <main className="mx-auto max-w-4xl px-4 py-16 text-center"><Sparkles className="mx-auto size-8 text-primary" /><h1 className="mt-4 font-display text-4xl font-bold">Custom Orders</h1><p className="mx-auto mt-4 max-w-xl text-muted-foreground">The secure custom-order workspace will activate as soon as Supabase is connected.</p><Button className="mt-6" variant="hero" asChild><Link to="/shop">Browse Products</Link></Button></main>;
  }

  if (!session) {
    return <main className="mx-auto max-w-4xl px-4 py-16 text-center"><MessageCircleMore className="mx-auto size-8 text-primary" /><h1 className="mt-4 font-display text-4xl font-bold">Start a Custom Creation</h1><p className="mx-auto mt-4 max-w-xl text-muted-foreground">Sign in or create an account so your custom request and chat stay connected to you.</p><div className="mt-7 flex justify-center gap-3"><Button variant="hero" asChild><Link to="/account">Sign In / Create Account</Link></Button><Button variant="soft" asChild><Link to="/shop">Browse Products</Link></Button></div></main>;
  }

  return (
    <main className="min-h-[75vh] bg-[oklch(0.985_0.01_320)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Custom creations</p><h1 className="mt-2 font-display text-4xl font-bold">Your Custom Orders</h1><p className="mt-2 text-muted-foreground">Share your idea, chat with JMB and approve the details before it becomes an order.</p></div>
          <Button variant="hero" onClick={() => setShowForm((value) => !value)}><Plus aria-hidden /> New Custom Request</Button>
        </div>

        {showForm && (
          <form onSubmit={createRequest} className="mt-7 rounded-[2rem] border border-border bg-card p-6 shadow-soft">
            <h2 className="text-xl font-bold">Tell us what you want to create</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">Your name<Input name="name" required className="mt-2" /></label>
              <label className="text-sm font-bold">Product<select name="product" required className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">{productOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-bold">Colors / theme<Input name="colors" className="mt-2" placeholder="Purple, gold, Lakers, butterflies..." /></label>
              <label className="text-sm font-bold">Size / option<Input name="size" className="mt-2" placeholder="12oz, 16oz, 24oz, dimensions..." /></label>
              <label className="text-sm font-bold">Quantity<Input name="quantity" type="number" min="1" defaultValue="1" className="mt-2" /></label>
              <label className="text-sm font-bold">Fulfillment<select name="fulfillment" className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option>Not sure</option><option>Shipping</option><option>Local Pickup</option></select></label>
            </div>
            <label className="mt-4 block text-sm font-bold">Describe your idea<textarea name="idea" required rows={4} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Tell JMB what you want changed, personalized or created..." /></label>
            <Button type="submit" variant="hero" className="mt-5" disabled={busy}>{busy ? "Creating..." : "Start Request & Chat"}</Button>
          </form>
        )}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[1.75rem] border border-border bg-card p-4 shadow-soft">
            <h2 className="px-2 text-lg font-bold">Your Requests</h2>
            <div className="mt-3 space-y-2">
              {requests.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">No custom requests yet.</p> : requests.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-2xl border p-4 text-left ${selectedId === item.id ? "border-primary/40 bg-secondary/45" : "border-border"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-primary">{requestCode(item)}</p><p className="mt-1 text-sm font-bold">{item.product_family}</p></div><span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-bold text-primary">{item.status}</span></div></button>)}
            </div>
          </aside>

          <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft">
            {!selected ? <div className="p-10 text-center text-sm text-muted-foreground">Choose a request or start a new one.</div> : <>
              <header className="border-b border-border bg-secondary/30 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-primary">{requestCode(selected)}</p><h2 className="mt-1 text-xl font-bold">{selected.product_family}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.colors || "Custom design"}{selected.size ? ` • ${selected.size}` : ""}</p></div><div className="text-right"><span className="rounded-full bg-card px-3 py-1 text-xs font-bold text-primary">{selected.status}</span>{selected.quote != null && <p className="mt-3 font-display text-xl font-bold">Quote ${Number(selected.quote).toFixed(2)}</p>}</div></div></header>
              <div className="max-h-[520px] min-h-[360px] space-y-3 overflow-y-auto bg-[oklch(0.99_0.008_320)] p-5">
                {messages.length === 0 ? <p className="text-center text-sm text-muted-foreground">Your conversation will appear here.</p> : messages.map((item) => <div key={item.id} className={`flex ${item.sender === "customer" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${item.sender === "customer" ? "bg-gradient-plum text-primary-foreground" : "border border-border bg-card"}`}><p>{item.body}</p><p className={`mt-1 text-[10px] ${item.sender === "customer" ? "text-white/70" : "text-muted-foreground"}`}>{new Date(item.created_at).toLocaleString()}</p></div></div>)}
              </div>
              <form onSubmit={submitMessage} className="flex gap-2 border-t border-border p-4"><Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message JMB 2 Creations..." /><Button type="submit" variant="hero" size="icon" aria-label="Send message"><Send aria-hidden /></Button></form>
            </>}
          </section>
        </div>
      </div>
    </main>
  );
}
