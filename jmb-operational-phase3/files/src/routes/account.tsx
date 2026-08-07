import { Link, createFileRoute } from "@tanstack/react-router";
import { Box, LogOut, MessageCircleMore, PackageCheck, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  customerSignIn,
  customerSignOut,
  customerSignUp,
  getCustomerSession,
  isCustomerAuthConfigured,
  type CustomerSession,
} from "@/lib/customer-auth";
import { fetchCustomerRequests, requestCode, type CustomRequest } from "@/lib/custom-requests";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<CustomRequest[]>([]);

  useEffect(() => {
    if (!session) return;
    fetchCustomerRequests().then(setRequests).catch(() => setRequests([]));
  }, [session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const next = await customerSignIn(email.trim(), password);
        setSession(next);
        toast.success("Signed in");
      } else {
        const result = await customerSignUp(email.trim(), password);
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
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <main className="min-h-[70vh] bg-[oklch(0.985_0.01_320)] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Customer account</p>
              <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Your JMB Account</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Sign in to keep your orders, pickup details and custom creation conversations together in one place.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: PackageCheck, label: "Track orders" },
                  { icon: MessageCircleMore, label: "Custom chats" },
                  { icon: Box, label: "Pickup details" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-[1.5rem] border border-border bg-card p-4 shadow-soft">
                      <Icon className="size-5 text-primary" aria-hidden />
                      <p className="mt-2 text-sm font-bold">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
              {!isCustomerAuthConfigured() && (
                <div className="mb-5 rounded-2xl bg-secondary/45 p-4 text-sm text-muted-foreground">
                  Secure account access will activate as soon as the Supabase URL and anon key are added.
                </div>
              )}
              <div className="flex rounded-full bg-secondary/45 p-1">
                <button type="button" onClick={() => setMode("signin")} className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${mode === "signin" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Sign In</button>
                <button type="button" onClick={() => setMode("signup")} className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Create Account</button>
              </div>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="account-email" className="text-sm font-bold">Email</label>
                  <Input id="account-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2" autoComplete="email" />
                </div>
                <div>
                  <label htmlFor="account-password" className="text-sm font-bold">Password</label>
                  <Input id="account-password" type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={busy || !isCustomerAuthConfigured()}>
                  <UserRound aria-hidden /> {busy ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
                </Button>
              </form>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-[oklch(0.985_0.01_320)] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Customer portal</p>
            <h1 className="mt-2 font-display text-4xl font-bold">Welcome back</h1>
            <p className="mt-2 text-muted-foreground">{session.user?.email}</p>
          </div>
          <Button variant="soft" onClick={() => { customerSignOut(); setSession(null); setRequests([]); }}><LogOut aria-hidden /> Sign Out</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-soft"><PackageCheck className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Orders</p><p className="mt-1 font-display text-3xl font-bold">0</p></div>
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-soft"><MessageCircleMore className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Custom requests</p><p className="mt-1 font-display text-3xl font-bold">{requests.length}</p></div>
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-soft"><Box className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">Pickup ready</p><p className="mt-1 font-display text-3xl font-bold">0</p></div>
        </div>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-2xl font-bold">Custom Requests</h2><p className="mt-1 text-sm text-muted-foreground">Continue your conversations with JMB 2 Creations.</p></div>
            <Button variant="hero" asChild><Link to="/custom-orders">Start / Open Custom Request</Link></Button>
          </div>
          <div className="mt-5 space-y-3">
            {requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">You do not have any custom requests yet.</div>
            ) : requests.slice(0, 5).map((request) => (
              <Link key={request.id} to="/custom-orders" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4 hover:bg-secondary/25">
                <div><p className="font-bold text-primary">{requestCode(request)}</p><p className="mt-1 text-sm font-bold">{request.product_family}</p></div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">{request.status}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
