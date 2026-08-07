import { adminClient, corsHeaders, json, sha256Hex } from "../_shared/jmb.ts";

type Input = {
  action?: "read" | "send";
  requestId?: string;
  token?: string;
  body?: string;
};

function safeRequest(request: Record<string, unknown>) {
  const { guest_token_hash: _guestTokenHash, ...safe } = request;
  return safe;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const input = await req.json() as Input;
    const action = input.action === "send" ? "send" : "read";
    const requestId = String(input.requestId || "").trim();
    const token = String(input.token || "").trim();
    if (!requestId || !token) return json({ error: "Private request ID and token are required." }, 400);

    const client = adminClient();
    const { data: request, error: requestError } = await client
      .from("jmb_custom_requests")
      .select("*")
      .eq("id", requestId)
      .eq("is_guest", true)
      .maybeSingle();

    if (requestError) throw new Error(requestError.message);
    if (!request) return json({ error: "Private request not found." }, 404);

    const suppliedHash = await sha256Hex(token);
    if (!request.guest_token_hash || suppliedHash !== request.guest_token_hash) {
      return json({ error: "This private request link is invalid." }, 403);
    }

    if (action === "send") {
      const body = String(input.body || "").trim();
      if (!body) return json({ error: "Message cannot be empty." }, 400);
      const { data: message, error: messageError } = await client
        .from("jmb_custom_messages")
        .insert({ request_id: requestId, sender: "customer", sender_user_id: null, body })
        .select("*")
        .single();
      if (messageError || !message) throw new Error(messageError?.message || "Could not send message.");
      return json({ message });
    }

    const { data: messages, error: messagesError } = await client
      .from("jmb_custom_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    if (messagesError) throw new Error(messagesError.message);

    return json({ request: safeRequest(request), messages: messages ?? [] });
  } catch (error) {
    console.error("Guest custom access failed", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
