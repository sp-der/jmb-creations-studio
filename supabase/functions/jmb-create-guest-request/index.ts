import { adminClient, corsHeaders, emailShell, json, makePrivateToken, sendEmail, sha256Hex, siteUrl } from "../_shared/jmb.ts";

type Input = { firstName?: string; lastName?: string; email?: string; productFamily?: string; idea?: string; colors?: string; size?: string; quantity?: number; fulfillment?: "Shipping" | "Local Pickup" | "Not sure" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const input = await req.json() as Input;
    const firstName = String(input.firstName || "").trim(); const lastName = String(input.lastName || "").trim(); const email = String(input.email || "").trim().toLowerCase();
    const product = String(input.productFamily || "").trim(); const idea = String(input.idea || "").trim();
    if (!firstName || !lastName || !email.includes("@") || !product || !idea) return json({ error: "First name, last name, email, product and request details are required." }, 400);
    const guestToken = makePrivateToken(); const guestHash = await sha256Hex(guestToken); const client = adminClient();
    const { data: request, error } = await client.from("jmb_custom_requests").insert({
      customer_user_id: null, customer_name: `${firstName} ${lastName}`, customer_email: email, first_name: firstName, last_name: lastName,
      product_family: product, idea, colors: input.colors || null, size: input.size || null, quantity: Math.max(1, Number(input.quantity) || 1),
      fulfillment: input.fulfillment || "Not sure", status: "New", is_guest: true, guest_token_hash: guestHash,
    }).select("*").single();
    if (error || !request) throw new Error(error?.message || "Could not create request.");
    const { error: messageError } = await client.from("jmb_custom_messages").insert({ request_id: request.id, sender: "customer", sender_user_id: null, body: idea });
    if (messageError) throw new Error(messageError.message);
    const accessUrl = `${siteUrl()}/guest/custom/${request.id}?token=${encodeURIComponent(guestToken)}`;
    const code = `REQ-${String(request.request_number).padStart(3, "0")}`;
    let emailSent = true;
    try { await sendEmail({ to: email, subject: `Your JMB custom request — ${code}`, html: emailShell("Your custom request is open", `<p>Hi ${firstName},</p><p>We received your custom request <strong>${code}</strong> for <strong>${product}</strong>.</p><p>Use the private link below to chat with JMB, see the quote, and follow the request without creating an account.</p><p style="margin:24px 0"><a href="${accessUrl}" style="background:#6b55ae;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open Your Custom Chat</a></p><p style="font-size:12px;color:#786d80">Keep this link private because anyone with it can view this guest conversation.</p>`) }); }
    catch (emailError) { emailSent = false; console.error("Guest request email failed", emailError); }
    return json({ request, guestToken, accessUrl, emailSent });
  } catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 500); }
});
