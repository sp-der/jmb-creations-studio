import { corsHeaders, getShipFromAddress, json, shippoHeaders } from "../_shared/jmb.ts";

type ShippingPayload = {
  address?: { firstName?: string; lastName?: string; email?: string; address1?: string; address2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  parcel?: { weightOz?: number; lengthIn?: number; widthIn?: number; heightIn?: number };
};

function shippoMessage(messages: any[]) {
  return (messages ?? [])
    .map((message: any) => message?.text || message?.code)
    .filter(Boolean)
    .join("; ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json() as ShippingPayload;
    const address = body.address ?? {};
    const parcel = body.parcel ?? {};
    if (!address.firstName || !address.lastName || !address.address1 || !address.city || !address.state || !address.postalCode) {
      return json({ error: "Complete shipping address required." }, 400);
    }

    const from = await getShipFromAddress();
    const response = await fetch("https://api.goshippo.com/shipments/", {
      method: "POST",
      headers: shippoHeaders(),
      body: JSON.stringify({
        address_to: {
          name: `${address.firstName} ${address.lastName}`,
          email: address.email,
          street1: address.address1,
          street2: address.address2 || undefined,
          city: address.city,
          state: address.state,
          zip: address.postalCode,
          country: address.country || "US",
        },
        address_from: from,
        parcels: [{
          weight: String(Math.max(0.1, Number(parcel.weightOz) || 8)),
          mass_unit: "oz",
          length: String(Math.max(0.1, Number(parcel.lengthIn) || 8)),
          width: String(Math.max(0.1, Number(parcel.widthIn) || 6)),
          height: String(Math.max(0.1, Number(parcel.heightIn) || 4)),
          distance_unit: "in",
        }],
        async: false,
      }),
    });

    if (!response.ok) return json({ error: `Shipping provider error: ${await response.text()}` }, 502);
    const shipment = await response.json();
    const rates = (shipment.rates ?? [])
      .map((rate: any) => ({
        id: rate.object_id,
        carrier: rate.provider,
        service: rate.servicelevel?.name || rate.servicelevel?.token || "Shipping",
        rate: Number(rate.amount),
        deliveryDays: rate.estimated_days == null ? null : Number(rate.estimated_days),
        shipmentId: shipment.object_id,
      }))
      .filter((rate: any) => rate.id && Number.isFinite(rate.rate))
      .sort((a: any, b: any) => a.rate - b.rate)
      .slice(0, 10);

    if (!rates.length) {
      const detail = shippoMessage(shipment.messages);
      return json({ error: detail ? `Shippo could not return shipping rates: ${detail}` : "Shippo did not return any shipping rates for this address." }, 502);
    }

    return json({ rates });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
