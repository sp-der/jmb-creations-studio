import { Link, createFileRoute } from "@tanstack/react-router";
import { Box, Inbox, LayoutDashboard, MessageCircleMore, PackageCheck, Send, ShoppingBag, Store } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CatalogManager } from "@/components/admin/CatalogManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminSession, isSupabaseCatalogConfigured } from "@/lib/live-catalog";
import {
  fetchAdminRequests,
  fetchMessages,
  requestCode,
  sendMessage,
  updateRequest,
  type CustomMessage,
  type CustomRequest,
  type CustomRequestStatus,
} from "@/lib/custom-requests";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard | JMB 2 Creations" }, { name: "description", content: "Manage the JMB 2 Creations catalog, orders and customer requests." }] }),
  component: AdminDashboard,
});

type AdminSection = "overview" | "catalog" | "orders" | "requests";
const sections = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "catalog" as const, label: "Catalog", icon: Box },
  { id: "orders" as const, label: "Orders", icon: ShoppingBag },
  { id: "requests" as const, label: "Custom Chats", icon: MessageCircleMore },
];

function statusClass(status: string) {
  if (["Accepted", "Converted"].includes(status)) return "border-transparent bg-emerald-100 text-emerald-800";
  if (["Quoted", "In Review"].includes(status)) return "border-transparent bg-violet-100 text-violet-800";
  if (["Declined"].includes(status)) return "border-transparent bg-rose-100 text-rose-800";
  return "border-transparent bg-amber-100 text-amber-800";
}

function AdminDashboard() {
  const [section, setSection] = useState<AdminSection>("overview");
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState("");
  const selected = useMemo(() => requests.find((item) => item.id === selectedId) ?? null, [requests, selectedId]);
  const configured = isSupabaseCatalogConfigured();
  const signedIn = Boolean(getAdminSession()?.access_token);

  async function refreshRequests() {
    if (!configured || !signedIn) { setRequests([]); return; }
    try {
      const rows = await fetchAdminRequests();
      setRequests(rows);
      setSelectedId((current) => current ?? rows[0]?.id ?? null);
    } catch { setRequests([]); }
  }

  async function refreshMessages(id: string) {
    try { setMessages(await fetchMessages(id, "admin")); }
    catch { setMessages([]); }
  }

  useEffect(() => { void refreshRequests(); }, [section, configured, signedIn]);
  useEffect(() => {
    if (!selectedId || !signedIn) { setMessages([]); return; }
    void refreshMessages(selectedId);
    const timer = window.setInterval(() => void refreshMessages(selectedId), 5000);
    return () => window.clearInterval(timer);
  }, [selectedId, signedIn]);
  useEffect(() => { setQuote(selected?.quote == null ? "" : String(selected.quote)); }, [selected?.id, selected?.quote]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !message.trim()) return;
    const body = message.trim();
    setMessage("");
    try { await sendMessage(selectedId, "admin", body); await refreshMessages(selectedId); }
    catch (error) { setMessage(body); toast.error(error instanceof Error ? error.message : "Message could not be sent."); }
  }

  async function saveRequestPatch(patch: Partial<Pick<CustomRequest, "status" | "quote">>) {
    if (!selected) return;
    try {
      const updated = await updateRequest(selected.id, patch);
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast.success(`${requestCode(updated)} updated`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request could not be updated."); }
  }

  const newRequests = requests.filter((item) => item.status === "New").length;
  const openRequests = requests.filter((item) => !["Declined", "Converted"].includes(item.status)).length;

  return (
    <div className="min-h-dvh bg-[oklch(0.975_0.012_320)] text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-20 items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex h-14 w-28 items-center overflow-hidden" aria-label="Storefront home"><img src="/logoheader.png" alt="JMB 2 Creations" className="h-full w-full scale-125 object-contain" /></Link>
          <div className="hidden h-8 w-px bg-border sm:block" />
          <div><p className="font-display text-lg font-bold">Admin Dashboard</p><p className="text-xs text-muted-foreground">Manage catalog, orders and custom chats</p></div>
          <Button variant="hero" size="sm" asChild className="ml-auto"><Link to="/"><Store aria-hidden /> Storefront</Link></Button>
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-5rem)] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-card px-3 py-3 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Admin sections">
            {sections.map((item) => { const Icon = item.icon; const active = section === item.id; return <button key={item.id} type="button" onClick={() => setSection(item.id)} className={cn("flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition-colors lg:w-full", active ? "bg-gradient-plum text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-secondary/60 hover:text-foreground")}><Icon className="size-4" aria-hidden />{item.label}{item.id === "requests" && openRequests > 0 && <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px]", active ? "bg-white/20" : "bg-secondary text-primary")}>{openRequests}</span>}</button>; })}
          </nav>
          <div className="mt-8 hidden rounded-[1.5rem] bg-secondary/40 p-4 lg:block"><p className="text-sm font-bold">Quick links</p><div className="mt-3 space-y-2 text-xs"><Link to="/account" className="block text-muted-foreground hover:text-foreground">Customer portal</Link><Link to="/cart" className="block text-muted-foreground hover:text-foreground">Cart</Link><Link to="/custom-orders" className="block text-muted-foreground hover:text-foreground">Customer custom orders</Link></div></div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {section === "overview" && <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Store operations</p><h1 className="mt-1 text-3xl font-bold">JMB Dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Catalog, orders and customer conversations in one workspace.</p></div><Badge className="rounded-full bg-gradient-plum px-4 py-2 text-primary-foreground">{configured ? "Supabase connected" : "Supabase setup pending"}</Badge></div>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { icon: Inbox, label: "New orders", value: "0", detail: "Checkout connection next" },
                { icon: Box, label: "In production", value: "0", detail: "Live orders only" },
                { icon: PackageCheck, label: "Pickup ready", value: "0", detail: "Live orders only" },
                { icon: MessageCircleMore, label: "Open custom requests", value: String(openRequests), detail: `${newRequests} new` },
              ].map((item) => {
                const Icon = item.icon;
                return <div key={item.label} className="rounded-[1.5rem] border border-border bg-card p-5 shadow-soft"><Icon className="size-5 text-primary" /><p className="mt-3 text-sm font-semibold text-muted-foreground">{item.label}</p><p className="mt-1 font-display text-3xl font-bold">{item.value}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div>;
              })}
            </section>
            <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft"><h2 className="text-xl font-bold">Recent Orders</h2><p className="mt-1 text-sm text-muted-foreground">Real customer orders will appear here after checkout is connected.</p><div className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No live orders yet.</div><Button variant="soft" className="mt-4" onClick={() => setSection("orders")}>Open Orders</Button></section><section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft"><h2 className="text-xl font-bold">Custom Request Inbox</h2><p className="mt-1 text-sm text-muted-foreground">Requests submitted by signed-in customers appear here.</p><div className="mt-5 rounded-2xl bg-secondary/35 p-5"><p className="font-display text-3xl font-bold">{openRequests}</p><p className="mt-1 text-sm text-muted-foreground">open conversation(s)</p></div><Button variant="hero" className="mt-4" onClick={() => setSection("requests")}>Open Custom Chats</Button></section></div>
          </div>}

          {section === "catalog" && <CatalogManager />}

          {section === "orders" && <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Order management</p><h1 className="mt-1 text-3xl font-bold">Orders</h1><p className="mt-2 text-sm text-muted-foreground">Shipping and local pickup orders will be managed here.</p></div><section className="rounded-[1.75rem] border border-border bg-card p-10 text-center shadow-soft"><ShoppingBag className="mx-auto size-8 text-primary" /><h2 className="mt-4 text-xl font-bold">No live orders yet</h2><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">The demo orders have been removed. This section is ready for the real checkout/order tables once the Supabase setup is complete.</p></section></div>}

          {section === "requests" && <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Custom requests</p><h1 className="mt-1 text-3xl font-bold">Messages & Quotes</h1><p className="mt-2 text-sm text-muted-foreground">Chat with customers, quote their request and move approved work toward an order.</p></div>{!signedIn ? <section className="rounded-[1.75rem] border border-border bg-card p-8 shadow-soft"><h2 className="text-xl font-bold">Admin sign-in required</h2><p className="mt-2 text-sm text-muted-foreground">Open the Catalog tab and sign in with JMB's Supabase admin account. That same secure session unlocks custom requests.</p><Button className="mt-5" variant="hero" onClick={() => setSection("catalog")}>Go to Catalog Sign In</Button></section> : <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]"><aside className="rounded-[1.75rem] border border-border bg-card p-4 shadow-soft"><div className="flex items-center justify-between gap-3 px-2"><h2 className="font-bold">Inbox</h2><Badge variant="secondary">{requests.length}</Badge></div><div className="mt-3 space-y-2">{requests.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">No customer requests yet.</p> : requests.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={cn("w-full rounded-2xl border p-4 text-left", selectedId === item.id ? "border-primary/40 bg-secondary/45" : "border-border")}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-primary">{requestCode(item)}</p><p className="mt-1 truncate text-sm font-bold">{item.customer_name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.product_family}</p></div><Badge className={cn("rounded-full", statusClass(item.status))}>{item.status}</Badge></div></button>)}</div></aside><section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft">{!selected ? <div className="p-10 text-center text-sm text-muted-foreground">Choose a request from the inbox.</div> : <><header className="border-b border-border p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{requestCode(selected)}</p><h2 className="mt-1 text-2xl font-bold">{selected.product_family}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.customer_name} • {selected.customer_email}</p></div><select value={selected.status} onChange={(event) => void saveRequestPatch({ status: event.target.value as CustomRequestStatus })} className="h-10 rounded-xl border border-input bg-background px-3 text-sm"><option>New</option><option>In Review</option><option>Quoted</option><option>Accepted</option><option>Declined</option><option>Converted</option></select></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-secondary/35 p-3"><p className="text-xs text-muted-foreground">Colors</p><p className="mt-1 text-sm font-bold">{selected.colors || "Not specified"}</p></div><div className="rounded-2xl bg-secondary/35 p-3"><p className="text-xs text-muted-foreground">Size</p><p className="mt-1 text-sm font-bold">{selected.size || "Not specified"}</p></div><div className="rounded-2xl bg-secondary/35 p-3"><p className="text-xs text-muted-foreground">Qty / fulfillment</p><p className="mt-1 text-sm font-bold">{selected.quantity} • {selected.fulfillment}</p></div></div><div className="mt-4 flex gap-2"><Input type="number" min="0" step="0.01" value={quote} onChange={(event) => setQuote(event.target.value)} placeholder="Quote amount" /><Button variant="soft" onClick={() => void saveRequestPatch({ quote: quote === "" ? null : Number(quote), status: quote === "" ? selected.status : "Quoted" })}>Save Quote</Button></div></header><div className="max-h-[460px] min-h-[320px] space-y-3 overflow-y-auto bg-[oklch(0.99_0.008_320)] p-5">{messages.map((item) => <div key={item.id} className={`flex ${item.sender === "admin" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${item.sender === "admin" ? "bg-gradient-plum text-primary-foreground" : "border border-border bg-card"}`}><p>{item.body}</p><p className={`mt-1 text-[10px] ${item.sender === "admin" ? "text-white/70" : "text-muted-foreground"}`}>{new Date(item.created_at).toLocaleString()}</p></div></div>)}</div><form onSubmit={submitMessage} className="flex gap-2 border-t border-border p-4"><Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Reply to customer..." /><Button type="submit" variant="hero" size="icon"><Send aria-hidden /></Button></form></>}</section></div>}</div>}
        </main>
      </div>
    </div>
  );
}
