import { adminClient, emailButton, emailShell, money } from "./jmb.ts";
import { escapeHtml as e, portalLink, retrySeconds, SITE } from "./order-logic.ts";
type DB = ReturnType<typeof adminClient>;
type Job = {
  id: string;
  order_id: string;
  kind: string;
  message_id: string | null;
  subject: string | null;
  body: string | null;
  attempts: number;
  lease_id: string;
  payload: Record<string, unknown> | null;
  first_attempt_at: string | null;
};
export async function businessEmail(client: DB): Promise<string> {
  // Reuse deployed configuration only. Never substitute an invented destination.
  const email = Deno.env.get("JMB_NOTIFICATION_EMAIL") || Deno.env.get("SUPPORT_EMAIL");
  if (email) return email;
  const { data: settings, error } = await client.from("jmb_store_settings").select("notification_email").eq("id", 1).maybeSingle();
  if (error || !settings?.notification_email) throw new Error("Business notification email is not configured.");
  return settings.notification_email;
}
async function buildPayload(client: DB, job: Job) {
  const from = Deno.env.get("JMB_FROM_EMAIL");
  if (!from) throw new Error("JMB_FROM_EMAIL is not configured.");
  const { data: order, error } = await client
    .from("jmb_orders")
    .select("*")
    .eq("id", job.order_id)
    .single();
  if (error) throw new Error("Notification order unavailable.");
  const toAdmin = job.kind.endsWith("_admin");
  const code = `JMB-${String(order.order_number).padStart(4, "0")}`;
  let token = "";
  if (!toAdmin && !order.customer_user_id) {
    const result = await client.rpc("jmb_order_portal_token", { p_order_id: order.id });
    if (result.error) throw new Error("Private notification link unavailable.");
    token = result.data;
  }
  const link = toAdmin
    ? `${SITE}/admin?order=${order.id}`
    : portalLink(order.id, Boolean(order.customer_user_id), token);
  let subject: string;
  let body: string;
  let text: string;
  if (job.kind.startsWith("paid_")) {
    const { data: items, error: lineError } = await client
      .from("jmb_order_items")
      .select("quantity,name,team,option,line_total")
      .eq("order_id", order.id)
      .order("created_at");
    if (lineError) throw new Error("Order items unavailable.");
    const date = new Intl.DateTimeFormat("en-US", {
      timeZone: Deno.env.get("JMB_TIMEZONE") || "America/Los_Angeles",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(order.created_at));
    subject = `${toAdmin ? "New paid order" : "Payment confirmed"} — ${code}`;
    const summary = `${order.first_name} ${order.last_name} · ${date} · ${order.fulfillment} · ${money(order.total)}`;
    body = `<p>${toAdmin ? "A customer completed payment." : "Thank you! Square has confirmed your payment."}</p><p><strong>${e(code)}</strong><br>${e(summary)}</p><table role="presentation" style="width:100%;border-collapse:collapse">${(items ?? []).map((item) => `<tr><td style="padding:10px 0">${e(item.quantity)}× ${e(item.name)}<br><small>${e([item.team, item.option].filter(Boolean).join(" • "))}</small></td><td style="text-align:right">${money(item.line_total)}</td></tr>`).join("")}</table><p>Shipping: ${money(order.shipping_amount)}<br><strong>Total paid: ${money(order.total)}</strong></p>`;
    text = `${subject}\n${summary}\n${(items ?? []).map((item) => `${item.quantity}× ${item.name}: ${money(item.line_total)}`).join("\n")}`;
  } else if (job.kind === "admin_email") {
    subject = `${job.subject} — ${code}`;
    body = `<p>Regarding <strong>${e(code)}</strong></p><div style="white-space:pre-wrap;overflow-wrap:anywhere">${e(job.body)}</div>`;
    text = `${subject}\n\n${job.body}`;
  } else {
    const { data: message, error: messageError } = await client
      .from("jmb_order_messages")
      .select("body,sender_name")
      .eq("id", job.message_id)
      .single();
    if (messageError) throw new Error("Message unavailable.");
    subject = `New ${toAdmin ? "customer " : "JMB "}message — ${code}`;
    body = `<p>${e(message.sender_name)} sent a message about <strong>${e(code)}</strong>.</p><div style="white-space:pre-wrap;overflow-wrap:anywhere;background:#f5effb;padding:20px;border-radius:16px">${e(message.body)}</div>`;
    text = `${subject}\n\n${message.body}`;
  }
  const notificationEmail = await businessEmail(client);
  return {
    from,
    to: [toAdmin ? notificationEmail : order.customer_email],
    subject,
    html: emailShell(
      e(subject),
      body + emailButton(toAdmin ? "Open Order & Reply" : "View Order & Reply", e(link)),
    ),
    text: `${text}\n\n${link}`,
    reply_to: toAdmin ? order.customer_email : notificationEmail,
  };
}
export async function drainNotifications(client: DB, orderId: string | null = null) {
  const { data, error } = await client.rpc("jmb_claim_notifications", { p_order_id: orderId });
  if (error) throw new Error("Notification queue unavailable.");
  const results: Array<{ id: string; state: string }> = [];
  for (const job of (data ?? []) as Job[]) {
    let permanent = false;
    try {
      const payload = job.payload || (await buildPayload(client, job));
      const apiKey = Deno.env.get("RESEND_API_KEY");
      if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
      // Freeze payload and first possible send time before contacting Resend.
      const saved = await client
        .from("jmb_notification_outbox")
        .update({ payload, first_attempt_at: job.first_attempt_at || new Date().toISOString() })
        .eq("id", job.id)
        .eq("lease_id", job.lease_id)
        .select("id")
        .single();
      if (saved.error) throw new Error("Notification payload could not be saved.");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `jmb-order-${job.id}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        permanent =
          response.status >= 400 &&
          response.status < 500 &&
          ![408, 409, 429].includes(response.status);
        throw new Error(`Resend HTTP ${response.status}`); // Do not log provider bodies or customer data.
      }
      const result = await response.json();
      if (!result.id) throw new Error("Resend did not return a message ID.");
      const done = await client
        .from("jmb_notification_outbox")
        .update({
          state: "sent",
          provider_id: result.id,
          sent_at: new Date().toISOString(),
          lease_until: null,
          last_error: null,
        })
        .eq("id", job.id)
        .eq("lease_id", job.lease_id)
        .select("id")
        .single();
      if (done.error) throw new Error("Notification acknowledgement could not be saved.");
      results.push({ id: job.id, state: "sent" });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Notification delivery failed";
      console.error("JMB notification failed", { id: job.id, detail });
      const saved = await client
        .from("jmb_notification_outbox")
        .update({
          state: permanent ? "needs_review" : "pending",
          lease_until: null,
          last_error: detail,
          next_attempt_at: new Date(Date.now() + retrySeconds(job.attempts) * 1000).toISOString(),
        })
        .eq("id", job.id)
        .eq("lease_id", job.lease_id);
      if (saved.error)
        console.error("JMB notification recovery failed", { id: job.id, code: saved.error.code });
      results.push({ id: job.id, state: permanent ? "needs_review" : "pending" });
    }
  }
  return results;
}
