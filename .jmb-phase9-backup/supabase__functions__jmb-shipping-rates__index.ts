import { corsHeaders, easyPostAuth, json } from "../_shared/jmb.ts";

type ShippingPayload = {
  address?: { firstName?: string; lastName?: string; email?: string; address1?: string; address2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  parcel?: { weightOz?: number; lengthIn?: number; widthIn?: number; heightIn?: number };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json() as ShippingPayload;
    const address = body.address ?? {};
    const parcel = body.parcel ?? {};
    if (!address.firstName || !address.lastName || !address.address1 || !address.city || !address.state || !address.postalCode) return json({ error: "Complete shipping address required." }, 400);
    const from = {
      name: Deno.env.get("JMB_SHIP_FROM_NAME") || "JMB 2 Creations",
      street1: Deno.env.get("JMB_SHIP_FROM_STREET1"),
      street2: Deno.env.get("JMB_SHIP_FROM_STREET2") || undefined,
      city: Deno.env.get("JMB_SHIP_FROM_CITY"),
      state: Deno.env.get("JMB_SHIP_FROM_STATE"),
      zip: Deno.env.get("JMB_SHIP_FROM_ZIP"),
      country: Deno.env.get("JMB_SHIP_FROM_COUNTRY") || "US",
    };
    if (!from.street1 || !from.city || !from.state || !from.zip) throw new Error("JMB ship-from address secrets are incomplete.");
    const response = await fetch("https://api.easypost.com/v2/shipments", {
      method: "POST",
      headers: { Authorization: easyPostAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({ shipment: {
        to_address: { name: `${address.firstName} ${address.lastName}`, email: address.email, street1: address.address1, street2: address.address2 || undefined, city: address.city, state: address.state, zip: address.postalCode, country: address.country || "US" },
        from_address: from,
        parcel: { weight: Math.max(0.1, Number(parcel.weightOz) || 8), length: Math.max(0.1, Number(parcel.lengthIn) || 8), width: Math.max(0.1, Number(parcel.widthIn) || 6), height: Math.max(0.1, Number(parcel.heightIn) || 4) },
      } }),
    });
    if (!response.ok) return json({ error: `Shipping provider error: ${await response.text()}` }, 502);
    const shipment = await response.json();
    const rates = (shipment.rates ?? [])
      .map((rate: any) => ({ id: rate.id, carrier: rate.carrier, service: rate.service, rate: Number(rate.rate), deliveryDays: rate.delivery_days == null ? null : Number(rate.delivery_days), shipmentId: shipment.id }))
      .filter((rate: any) => Number.isFinite(rate.rate))
      .sort((a: any, b: any) => a.rate - b.rate)
      .slice(0, 10);
    return json({ rates });
  } catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 500); }
});
