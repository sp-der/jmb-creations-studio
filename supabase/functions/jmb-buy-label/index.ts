import { adminClient, corsHeaders, emailShell, getShipFromAddress, json, requireAdmin, sendEmail, shippoHeaders } from "../_shared/jmb.ts";

function shippoMessage(messages: any[]) {
  return (messages ?? [])
    .map((message: any) => message?.text || message?.code)
    .filter(Boolean)
    .join("; ");
}

async function buildOrderParcel(client: ReturnType<typeof adminClient>, orderId: string) {
  const { data: lines, error: lineError } = await client
    .from("jmb_order_items")
    .select("catalog_item_id,quantity")
    .eq("order_id", orderId);
  if (lineError) throw new Error(lineError.message);
  if (!lines?.length) throw new Error("This order does not have any shippable items.");

  const ids = [...new Set(lines.map((line: any) => line.catalog_item_id).filter(Boolean))];
  const catalog = new Map<string, any>();
  if (ids.length) {
    const { data: rows, error: catalogError } = await client
      .from("jmb_catalog_items")
      .select("id,weight_oz,length_in,width_in,height_in")
      .in("id", ids);
    if (catalogError) throw new Error(catalogError.message);
    for (const row of rows ?? []) catalog.set(row.id, row);
  }

  let weight = 0;
  let length = 8;
  let width = 6;
  let height = 0;
  for (const line of lines) {
    const quantity = Math.max(1, Number(line.quantity) || 1);
    const item = line.catalog_item_id ? catalog.get(line.catalog_item_id) : null;
    weight += (Number(item?.weight_oz) || 8) * quantity;
    length = Math.max(length, Number(item?.length_in) || 8);
    width = Math.max(width, Number(item?.width_in) || 6);
    height += (Number(item?.height_in) || 4) * quantity;
  }

  return {
    weight: String(Math.max(0.1, Math.round(weight * 100) / 100)),
    mass_unit: "oz",
    length: String(Math.max(0.1, length)),
    width: String(Math.max(0.1, width)),
    height: String(Math.max(0.1, height || 4)),
    distance_unit: "in",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const { orderId } = await req.json() as { orderId?: string };
    if (!orderId) return json({ error: "orderId is required." }, 400);

    const client = adminClient();
    const { data: order, error } = await client.from("jmb_orders").select("*").eq("id", orderId).single();
    if (error || !order) return json({ error: "Order not found." }, 404);
    if (order.fulfillment !== "Shipping") return json({ error: "This order is not a shipping order." }, 400);
    if (!order.easypost_shipment_id || !order.easypost_rate_id) return json({ error: "This order does not have a selected carrier rate." }, 400);
    if (order.label_url && order.tracking_code) return json({ order, labelUrl: order.label_url, trackingCode: order.tracking_code });

    let preferredProvider: string | null = null;
    let preferredServiceToken: string | null = null;
    let preferredServiceName: string | null = null;

    // Newly quoted Shippo IDs are 32-character object IDs. Older EasyPost orders keep
    // their legacy IDs and will simply receive the cheapest current Shippo rate.
    if (/^[0-9a-f]{32}$/i.test(String(order.easypost_shipment_id))) {
      const quotedResponse = await fetch(`https://api.goshippo.com/shipments/${encodeURIComponent(order.easypost_shipment_id)}`, {
        headers: shippoHeaders(),
      });
      if (quotedResponse.ok) {
        const quotedShipment = await quotedResponse.json();
        const quotedRate = (quotedShipment.rates ?? []).find((rate: any) => rate.object_id === order.easypost_rate_id);
        if (quotedRate) {
          preferredProvider = quotedRate.provider || null;
          preferredServiceToken = quotedRate.servicelevel?.token || null;
          preferredServiceName = quotedRate.servicelevel?.name || null;
        }
      }
    }

    const from = await getShipFromAddress();
    const parcel = await buildOrderParcel(client, orderId);
    const freshResponse = await fetch("https://api.goshippo.com/shipments/", {
      method: "POST",
      headers: shippoHeaders(),
      body: JSON.stringify({
        address_to: {
          name: `${order.first_name} ${order.last_name}`,
          email: order.customer_email,
          street1: order.address1,
          street2: order.address2 || undefined,
          city: order.city,
          state: order.state,
          zip: order.postal_code,
          country: order.country || "US",
        },
        address_from: from,
        parcels: [parcel],
        async: false,
      }),
    });
    if (!freshResponse.ok) return json({ error: `Shipping provider error: ${await freshResponse.text()}` }, 502);

    const freshShipment = await freshResponse.json();
    const freshRates = (freshShipment.rates ?? []).filter((rate: any) => Number.isFinite(Number(rate.amount)));
    if (!freshRates.length) {
      const detail = shippoMessage(freshShipment.messages);
      return json({ error: detail ? `Shippo could not return a current label rate: ${detail}` : "Shippo did not return a current label rate." }, 502);
    }

    let selectedRate = preferredServiceToken
      ? freshRates.find((rate: any) => rate.provider === preferredProvider && rate.servicelevel?.token === preferredServiceToken)
      : null;

    if (!selectedRate && preferredServiceName) {
      selectedRate = freshRates.find((rate: any) => rate.provider === preferredProvider && rate.servicelevel?.name === preferredServiceName);
    }

    if (!selectedRate && preferredProvider) {
      selectedRate = freshRates
        .filter((rate: any) => rate.provider === preferredProvider)
        .sort((a: any, b: any) => Number(a.amount) - Number(b.amount))[0] ?? null;
    }

    if (!selectedRate) {
      selectedRate = [...freshRates].sort((a: any, b: any) => Number(a.amount) - Number(b.amount))[0];
    }

    const code = `JMB-${String(order.order_number).padStart(4, "0")}`;
    const response = await fetch("https://api.goshippo.com/transactions", {
      method: "POST",
      headers: shippoHeaders(),
      body: JSON.stringify({
        rate: selectedRate.object_id,
        async: false,
        label_file_type: "PDF_4x6",
        metadata: code,
      }),
    });
    if (!response.ok) return json({ error: `Shipping provider error: ${await response.text()}` }, 502);

    const transaction = await response.json();
    const labelUrl = transaction.label_url || null;
    const trackingCode = transaction.tracking_number || null;
    const carrier = selectedRate.provider || preferredProvider || null;
    const trackingStatus = transaction.tracking_status || "PRE_TRANSIT";
    if (transaction.status !== "SUCCESS" || !labelUrl || !trackingCode) {
      const detail = shippoMessage(transaction.messages);
      return json({ error: detail ? `Shippo could not purchase the label: ${detail}` : "Shippo did not return a completed label and tracking number." }, 502);
    }

    const { data: updated, error: updateError } = await client
      .from("jmb_orders")
      .update({
        label_url: labelUrl,
        tracking_code: trackingCode,
        tracking_carrier: carrier,
        tracking_status: trackingStatus,
        status: "Shipped",
      })
      .eq("id", orderId)
      .select("*")
      .single();
    if (updateError || !updated) throw new Error(updateError?.message || "Could not save label details.");

    let emailSent = true;
    try {
      await sendEmail({
        to: updated.customer_email,
        subject: `Your JMB order has shipped — ${code}`,
        html: emailShell("Your order has shipped!", `<p>Hi ${updated.first_name},</p><p>Your shipping label for <strong>${code}</strong> has been created and your tracking information is now available.</p><div style="padding:18px;border-radius:16px;background:#faf2f7"><strong>${carrier || "Carrier"}</strong><div style="margin-top:6px;font-size:20px;font-weight:bold">${trackingCode}</div></div><p style="margin-top:20px">Carrier tracking will update as the package enters the mail stream.</p>`),
      });
    } catch (emailError) {
      emailSent = false;
      console.error("Tracking email failed", emailError);
    }

    return json({ order: updated, labelUrl, trackingCode, emailSent });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /authentication required|not authorized/i.test(message) ? 401 : 500;
    return json({ error: message }, status);
  }
});
