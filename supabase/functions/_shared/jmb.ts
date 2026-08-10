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

export async function sendEmail(input: { to: string; subject: string; html: string; replyTo?: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("JMB_FROM_EMAIL");
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and JMB_FROM_EMAIL must be configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html, ...(input.replyTo ? { reply_to: input.replyTo } : {}) }),
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

export function emailButton(label: string, href: string) {
  return `<div style="margin:26px 0;text-align:center"><a href="${href}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:linear-gradient(90deg,#6251b5,#9b659e);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px">${label}</a></div>`;
}

export function emailShell(title: string, body: string, eyebrow = "JMB 2 CREATIONS") {
  const logo = `${siteUrl()}/logo.png`;
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head>
<body style="margin:0;background:#fbf6fb;font-family:Arial,Helvetica,sans-serif;color:#211a38">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fbf6fb;padding:24px 10px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#ffffff;border:1px solid #eaddea;border-radius:28px;overflow:hidden;box-shadow:0 12px 38px rgba(82,62,118,.08)">
      <tr><td style="padding:28px 28px 24px;text-align:center;background:linear-gradient(135deg,#fff0f4 0%,#f7e8f2 45%,#e8e5ff 100%)">
        <img src="${logo}" alt="JMB 2 Creations" style="height:72px;max-width:170px;object-fit:contain;display:inline-block">
        <div style="margin-top:12px;font-size:11px;letter-spacing:3px;font-weight:800;color:#6553b7">${eyebrow}</div>
        <h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;color:#211a38">${title}</h1>
      </td></tr>
      <tr><td style="padding:28px;font-size:15px;line-height:1.65;color:#453d58">${body}</td></tr>
      <tr><td style="padding:18px 28px 26px;border-top:1px solid #f0e5ef;text-align:center;color:#8b8195;font-size:12px">
        <strong style="color:#5f50ad">JMB 2 Creations</strong><br>
        Questions? Reply to this email or contact support@jmb2creations.com.<br>
        <a href="${siteUrl()}" style="color:#7b5ab1;text-decoration:none">${siteUrl().replace(/^https?:\/\//, "")}</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function easyPostAuth() {
  const key = Deno.env.get("EASYPOST_API_KEY");
  if (!key) throw new Error("EASYPOST_API_KEY is not configured.");
  return `Basic ${btoa(`${key}:`)}`;
}
