import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Box, LogOut, MessageCircleMore, PackageCheck, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  customerSignIn,
  customerSignOut,
  customerSignUp,
  getCustomerSession,
  getValidCustomerSession,
  isCustomerAuthConfigured,
  isCustomerRemembered,
  type CustomerSession,
} from "@/lib/customer-auth";
import { fetchCustomerRequests, requestCode, type CustomRequest } from "@/lib/custom-requests";
import { fetchCustomerOrders, orderCode, type JmbOrder } from "@/lib/orders";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Customer Account | JMB 2 Creations" },
      { name: "description", content: "Sign in to manage JMB 2 Creations orders and custom requests." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const [session, setSession] = useState<CustomerSession | null>(() => getCustomerSession());
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() => isCustomerRemembered());
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [orders, setOrders] = useState<JmbOrder[]>([]);

  useEffect(() => {
    getValidCustomerSession().then((next) => setSession(next)).catch(() => setSession(null)).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!session) { setRequests([]); setOrders([]); return; }
    Promise.all([fetchCustomerRequests(), fetchCustomerOrders()])
      .then(([requestRows, orderRows]) => { setRequests(requestRows); setOrders(orderRows); })
      .catch(() => { setRequests([]); setOrders([]); });
  }, [session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const next = await customerSignIn(email.trim(), password, remember);
        setSession(next);
        toast.success("Signed in");
      } else {
        if (!firstName.trim() || !lastName.trim()) throw new Error("First and last name are required.");
        const result = await customerSignUp(email.trim(), password, remember, { first_name: firstName.trim(), last_name: lastName.trim() });
        if (result.access_token) {
          setSession(result);
          toast.success("Account created");
        } else {
          toast.success("Account created", { description: "Check your email to confirm your account, then sign in." });
          setMode("signin");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not continue.");
    } finally { setBusy(false); }
  }

  if (checking) return <main className="grid min-h-[70vh] place-items-center bg-[oklch(0.985_0.01_320)]"><p className="text-sm text-muted-foreground">Checking account...</p></main>;

  if (!session) {
    return (
      <main className="min-h-[70vh] bg-[oklch(0.985_0.01_320)] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft aria-hidden /> Back to Storefront</Link></Button>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Customer account</p>
              <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Your JMB Account</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">Sign in to keep orders, tracking, pickup details and custom chats together. You can also check out as a guest without creating an account.</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[{ icon: PackageCheck, label: "Track orders" }, { icon: MessageCircleMore, label: "Custom chats" }, { icon: Box, label: "Pickup details" }].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-[1.5rem] border border-border bg-card p-4 shadow-soft"><Icon className="size-5 text-primary" aria-hidden /><p className="mt-2 text-sm font-bold">{item.label}</p></div>; })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
              {!isCustomerAuthConfigured() && <div className="mb-5 rounded-2xl bg-secondary/45 p-4 text-sm text-muted-foreground">Secure account access activates when Supabase is configured.</div>}
              <div className="flex rounded-full bg-secondary/45 p-1">
                <button type="button" onClick={() => setMode("signin")} className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${mode === "signin" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Sign In</button>
                <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Create Account</button>
              </div>
              <form onSubmit={submit} className="mt-6 space-y-4">
                {mode === "signup" && <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="account-first" className="text-sm font-bold">First name</label><Input id="account-first" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-2" autoComplete="given-name" /></div><div><label htmlFor="account-last" className="text-sm font-bold">Last name</label><Input id="account-last" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-2" autoComplete="family-name" /></div></div>}
                <div><label htmlFor="account-email" className="text-sm font-bold">Email</label><Input id="account-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" autoComplete="email" /></div>
                <div><label htmlFor="account-password" className="text-sm font-bold">Password</label><Input id="account-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" autoComplete={mode === "signin" ? "current-password" : "new-password"} /></div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--primary)]" /><span><strong>Remember me</strong><span className="ml-1 text-muted-foreground">on this device</span></span></label>
                <Button type="submit" variant="hero" className="w-full" disabled={busy || !isCustomerAuthConfigured()}><UserRound aria-hidden /> {busy ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}</Button>
              </form>
              <p className="mt-4 text-center text-xs text-muted-foreground">No account? Guest checkout and guest custom requests are available from the cart and Custom Orders page.</p>
            </section>
          </div>
        </div>
      </main>
    );
  }

  const displayName = [session.user?.user_metadata?.first_name, session.user?.user_metadata?.last_name].filter((v) => typeof v === "string" && v).join(" ");
  return (
    <main className="min-h-[70vh] bg-[oklch(0.985_0.01_320)] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Customer portal</p><h1 className="mt-2 font-display text-4xl font-bold">Welcome back{displayName ? `, ${displayName}` : ""}</h1><p className="mt-2 text-muted-foreground">{session.user?.email}</p></div><Button variant="soft" onClick={() => { customerSignOut(); setSession(null); }}><LogOut aria-hidden /> Sign Out</Button></div>
        <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-soft"><PackageCheck className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Orders</p><p className="mt-1 font-display text-3xl font-bold">{orders.length}</p></div><div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-soft"><MessageCircleMore className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Custom requests</p><p className="mt-1 font-display text-3xl font-bold">{requests.length}</p></div><div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-soft"><Box className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Pickup ready</p><p className="mt-1 font-display text-3xl font-bold">{orders.filter((o) => o.status === "Ready for Pickup").length}</p></div></div>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-bold">Your Orders</h2><p className="mt-1 text-sm text-muted-foreground">Direct shop orders, status and tracking.</p></div><Button variant="soft" asChild><Link to="/shop">Shop Products</Link></Button></div><div className="mt-5 space-y-3">{orders.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No orders yet.</div> : orders.slice(0, 8).map((order) => <Link key={order.id} to="/orders/$orderId" params={{ orderId: order.id }} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4 hover:bg-secondary/20"><div><p className="font-bold text-primary">{orderCode(order)}</p><p className="mt-1 text-sm">{order.fulfillment} • {new Date(order.created_at).toLocaleDateString()}</p>{order.tracking_code && <p className="mt-1 text-xs text-muted-foreground">Tracking: {order.tracking_code}</p>}</div><div className="text-right"><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">{order.status}</span><p className="mt-2 font-bold">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(order.total)}</p></div></Link>)}</div></section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-bold">Custom Requests</h2><p className="mt-1 text-sm text-muted-foreground">Continue conversations with JMB 2 Creations.</p></div><Button variant="hero" asChild><Link to="/custom-orders">Start / Open Custom Request</Link></Button></div><div className="mt-5 space-y-3">{requests.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">You do not have any custom requests yet.</div> : requests.slice(0, 8).map((request) => <Link key={request.id} to="/custom-orders" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4 hover:bg-secondary/25"><div><p className="font-bold text-primary">{requestCode(request)}</p><p className="mt-1 text-sm font-bold">{request.product_family}</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">{request.status}</span></Link>)}</div></section>
      </div>
    </main>
  );
}
