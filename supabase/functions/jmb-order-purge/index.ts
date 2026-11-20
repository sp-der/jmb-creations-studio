import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
};
function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply({ error: "Admin sign-in required" }, 401);
    const body = await req.text();
    if (body.length > 2048) return reply({ error: "Invalid request" }, 400);
    const input = JSON.parse(body);
    if (
      typeof input?.orderId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(input.orderId) ||
      !Number.isSafeInteger(input.orderNumber) ||
      input.orderNumber < 1
    ) return reply({ error: "Invalid order confirmation" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = createClient(url, anon, { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError || !user) return reply({ error: "Admin sign-in required" }, 401);

    const db = createClient(url, service, { auth: { persistSession: false } });
    const { data: admin, error: adminError } = await db
      .from("jmb_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (adminError || !admin) return reply({ error: "Admin access required" }, 403);

    const { data, error } = await db.rpc("jmb_order_purge", {
      p_order_id: input.orderId,
      p_user_id: user.id,
      p_order_number: input.orderNumber,
    });
    if (error) return reply({
      error: error.message.includes("busy")
        ? error.message
        : "Order could not be permanently deleted. Check that it is in Trash and the order number matches.",
    }, 409);
    return reply({ deleted: data === true });
  } catch {
    return reply({ error: "Unable to permanently delete order" }, 500);
  }
});
