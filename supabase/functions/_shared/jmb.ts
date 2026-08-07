import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service environment is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function makePrivateToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
}

export function siteUrl() {
  return (Deno.env.get("SITE_URL") || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("JMB_FROM_EMAIL");
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and JMB_FROM_EMAIL must be configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
  });
  if (!response.ok) throw new Error(`Email provider error: ${await response.text()}`);
  return await response.json();
}

export async function getOptionalUser(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const client = adminClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function requireAdmin(req: Request) {
  const user = await getOptionalUser(req);
  if (!user) throw new Error("Admin authentication required.");
  const client = adminClient();
  const { data, error } = await client.from("jmb_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error || !data) throw new Error("This account is not authorized as a JMB admin.");
  return user;
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

export function emailShell(title: string, body: string) {
  const logo = `${siteUrl()}/logo.png`;
  return `<!doctype html><html><body style="margin:0;background:#f9f2f8;font-family:Arial,sans-serif;color:#29233f"><div style="max-width:640px;margin:0 auto;padding:28px 16px"><div style="background:linear-gradient(135deg,#f9c9d0,#f6d7e8,#dcd7f4);padding:26px;border-radius:24px 24px 0 0;text-align:center"><img src="${logo}" alt="JMB 2 Creations" style="height:80px;max-width:180px;object-fit:contain"><h1 style="margin:14px 0 0;font-size:26px">${title}</h1></div><div style="background:white;padding:28px;border-radius:0 0 24px 24px;border:1px solid #eadde9;border-top:0">${body}<p style="margin:28px 0 0;color:#8a8093;font-size:12px;text-align:center">JMB 2 Creations</p></div></div></body></html>`;
}

export function easyPostAuth() {
  const key = Deno.env.get("EASYPOST_API_KEY");
  if (!key) throw new Error("EASYPOST_API_KEY is not configured.");
  return `Basic ${btoa(`${key}:`)}`;
}
