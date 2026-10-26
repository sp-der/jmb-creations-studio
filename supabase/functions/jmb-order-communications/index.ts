import { adminClient, corsHeaders, getOptionalUser, json, requireAdmin } from "../_shared/jmb.ts";
import { orderAccess } from "../_shared/order-access.ts";
import { messageText, UUID } from "../_shared/order-logic.ts";
import { businessEmail, drainNotifications } from "../_shared/order-notifications.ts";
const fields = "id,order_id,sender,sender_name,body,created_at,admin_seen_at,customer_seen_at";
export async function handler(req: Request): Promise<Response> {
  const cors = {
    ...corsHeaders,
    "Access-Control-Allow-Headers": corsHeaders["Access-Control-Allow-Headers"] + ", x-jmb-worker",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 24000) return json({ error: "Request too large." }, 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return json({ error: "Invalid request." }, 400);
    const client = adminClient();
    if (body.action === "worker") {
      const result = await client.rpc("jmb_notification_worker_authorized", {
        p_key: req.headers.get("x-jmb-worker") || "",
      });
      if (result.error || result.data !== true) return json({ error: "Unauthorized." }, 401);
      if (body.health === true) {
        const from = Deno.env.get("JMB_FROM_EMAIL") || "";
        const notification = await businessEmail(client).catch(() => "");
        const configuration = {
          sender: from,
          notificationEmail: notification,
          resendConfigured: Boolean(Deno.env.get("RESEND_API_KEY")),
          squareConfigured: Boolean(
            Deno.env.get("SQUARE_ACCESS_TOKEN") && Deno.env.get("SQUARE_LOCATION_ID"),
          ),
          squareEnvironment: Deno.env.get("SQUARE_ENVIRONMENT") || "sandbox",
          webhookConfigured: Boolean(
            Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY_PRODUCTION") &&
            Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL_PRODUCTION"),
          ),
          siteUrl: Deno.env.get("SITE_URL") || "",
          timezone: Deno.env.get("JMB_TIMEZONE") || "America/Los_Angeles",
        };
        let emailTest: unknown = null;
        if (body.testDelivery === true && from && Deno.env.get("RESEND_API_KEY")) {
          // Only Resend's controlled delivery sink; never a customer or the business inbox.
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
              "Content-Type": "application/json",
              "Idempotency-Key": "jmb-deployment-sink-20261026",
            },
            body: JSON.stringify({
              from,
              to: ["delivered@resend.dev"],
              subject: "JMB deployment verification",
              text: "Controlled delivery verification. No customer information.",
            }),
            signal: AbortSignal.timeout(10000),
          });
          const result = await response.json();
          emailTest = {
            accepted: response.ok,
            status: response.status,
            providerId: response.ok ? result.id : null,
          };
        }
        let squareTest: unknown = null;
        if (body.checkSquare === true && configuration.squareConfigured) {
          const base =
            configuration.squareEnvironment.toLowerCase() === "production"
              ? "https://connect.squareup.com"
              : "https://connect.squareupsandbox.com";
          const response = await fetch(
            `${base}/v2/locations/${encodeURIComponent(Deno.env.get("SQUARE_LOCATION_ID")!)}`,
            {
              headers: {
                Authorization: `Bearer ${Deno.env.get("SQUARE_ACCESS_TOKEN")}`,
                "Square-Version": "2026-07-15",
              },
              signal: AbortSignal.timeout(10000),
            },
          );
          const result = await response.json();
          squareTest = {
            authorized: response.ok,
            status: response.status,
            locationMatches: result.location?.id === Deno.env.get("SQUARE_LOCATION_ID"),
          };
        }
        return json({ configuration, emailTest, squareTest });
      }
      return json({ results: await drainNotifications(client) });
    }
    if (["unread", "retry"].includes(body.action)) {
      try {
        await requireAdmin(req);
      } catch {
        return json({ error: "Admin access required." }, 403);
      }
      if (body.action === "retry") return json({ results: await drainNotifications(client) });
      const [messages, orders] = await Promise.all([
        client
          .from("jmb_order_messages")
          .select("order_id")
          .eq("sender", "customer")
          .is("admin_seen_at", null),
        client
          .from("jmb_orders")
          .select("id")
          .eq("payment_status", "Paid")
          .is("admin_seen_at", null)
          .not("payment_confirmed_at", "is", null),
      ]);
      if (messages.error || orders.error) throw new Error("Inbox unavailable.");
      const counts: Record<string, number> = {};
      for (const message of messages.data ?? [])
        counts[message.order_id] = (counts[message.order_id] || 0) + 1;
      return json({ counts, newOrders: (orders.data ?? []).map((o) => o.id) });
    }
    if (typeof body.orderId !== "string" || !UUID.test(body.orderId))
      return json({ error: "Invalid order." }, 400);
    const access = await orderAccess(req, body.orderId, body.token);
    if (!access) return json({ error: "Access denied." }, 403);
    const { order, user, admin } = access;
    const actor = admin ? "admin" : "customer";
    if (["email", "notifications"].includes(body.action) && !admin)
      return json({ error: "Admin access required." }, 403);
    if (body.action === "notifications") {
      const { data, error } = await client
        .from("jmb_notification_outbox")
        .select("id,kind,state,attempts,last_error,provider_id,sent_at,created_at,subject")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw new Error("Delivery status unavailable.");
      return json({ notifications: data });
    }
    if (body.action === "send" || body.action === "email") {
      if (typeof body.requestId !== "string" || !UUID.test(body.requestId))
        return json({ error: "Request ID required." }, 400);
      let text: string;
      let subject = "";
      try {
        text = messageText(body.message, body.action === "email" ? 10000 : 4000);
        if (body.action === "email") {
          subject = messageText(body.subject, 150);
          if (/[\r\n]/.test(subject)) throw new Error("Subject must be a single line.");
        }
      } catch (error) {
        return json({ error: (error as Error).message }, 400);
      }
      const saved =
        body.action === "send"
          ? await client.rpc("jmb_order_send", {
              p_order_id: order.id,
              p_request_id: body.requestId,
              p_sender: actor,
              p_user_id: admin || !access.guest ? (user?.id ?? null) : null,
              p_sender_name: admin ? "JMB 2 Creations" : `${order.first_name} ${order.last_name}`,
              p_body: text,
            })
          : await client.rpc("jmb_order_email", {
              p_order_id: order.id,
              p_request_id: body.requestId,
              p_user_id: user!.id,
              p_subject: subject,
              p_body: text,
            });
      if (saved.error)
        return json(
          {
            error: saved.error.message.includes("Too many")
              ? saved.error.message
              : "Request could not be saved; retry with the same message.",
          },
          saved.error.message.includes("Too many") ? 429 : 409,
        );
      // The transaction is already durable. Provider failure must not lose the message.
      try {
        await drainNotifications(client, order.id);
      } catch {
        console.error("JMB notification drain unavailable");
      }
      return json({
        saved: true,
        notification: "queued",
        id: body.action === "send" ? saved.data.id : saved.data,
      });
    }
    if (body.action === "list") {
      const offset = body.offset ?? 0;
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
        return json({ error: "Invalid page." }, 400);
      const { data, error } = await client
        .from("jmb_order_messages")
        .select(fields)
        .eq("order_id", order.id)
        .order("created_at")
        .order("id")
        .range(offset, offset + 199);
      if (error) throw new Error("Conversation unavailable.");
      return json({ messages: data });
    }
    if (body.action === "seen") {
      if (
        !Array.isArray(body.messageIds) ||
        body.messageIds.length > 10000 ||
        body.messageIds.some((id: unknown) => typeof id !== "string" || !UUID.test(id))
      )
        return json({ error: "Invalid messages." }, 400);
      if (body.messageIds.length) {
        const column = admin ? "admin_seen_at" : "customer_seen_at";
        const { error } = await client
          .from("jmb_order_messages")
          .update({ [column]: new Date().toISOString() })
          .eq("order_id", order.id)
          .neq("sender", actor)
          .is(column, null)
          .in("id", body.messageIds);
        if (error) throw new Error("Read status unavailable.");
      }
      if (admin) {
        const { error } = await client
          .from("jmb_orders")
          .update({ admin_seen_at: new Date().toISOString() })
          .eq("id", order.id)
          .is("admin_seen_at", null)
          .eq("payment_status", "Paid");
        if (error) throw new Error("Order alert unavailable.");
      }
      return json({ seen: true });
    }
    return json({ error: "Unknown action." }, 400);
  } catch {
    return json(
      {
        error:
          "Communication service unavailable or access denied. Please sign in again and retry.",
      },
      500,
    );
  }
}
Deno.serve(handler);
