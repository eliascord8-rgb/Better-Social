import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/api/v1/order",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { key, action, service, link, quantity } = body;

      if (!key) {
        return new Response(JSON.stringify({ error: "API Key is required" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Find user by API Key
      const user = await ctx.runQuery(api.users.getUserByApiKey, { apiKey: key });

      if (!user) {
        return new Response(JSON.stringify({ error: "Invalid API Key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (action === "add") {
        // Validate service
        const services = await ctx.runQuery(api.smm.getServices, {});
        const selectedService = services.find((s: any) => s.id === service || s.externalId === service);

        if (!selectedService) {
          return new Response(JSON.stringify({ error: "Invalid Service ID" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const cost = (selectedService.rate / 1000) * quantity;

        if (user.balance < cost) {
          return new Response(JSON.stringify({ error: "Insufficient balance" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const orderId = await ctx.runMutation(api.smm.placeOrder, {
          userId: user._id,
          serviceId: service,
          quantity: quantity,
          targetUrl: link,
        });

        return new Response(JSON.stringify({ order: orderId, status: "success" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (action === "services") {
        const services = await ctx.runQuery(api.smm.getServices, {});
        return new Response(JSON.stringify(services), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (action === "balance") {
        return new Response(JSON.stringify({ balance: user.balance, currency: "USD" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/payments/payeer",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Payeer IPN Logic
    const formData = await request.formData();
    const m_operation_id = formData.get("m_operation_id") as string;
    const m_orderid = formData.get("m_orderid") as string;
    const m_amount = formData.get("m_amount") as string;
    const m_status = formData.get("m_status") as string;

    if (m_status === "success") {
      // Extract userId from m_orderid (e.g. "USER_ID:12345")
      const userId = m_orderid.split(":")[1] as any;
      await ctx.runMutation(internal.payments.processPayment, {
        userId,
        amount: parseFloat(m_amount),
        provider: "payeer",
        transactionId: m_operation_id,
      });
    }

    return new Response("*ok*", { status: 200 });
  }),
});

http.route({
  path: "/api/payments/paypal",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // PayPal Webhook Logic
    const body = await request.json();
    if (body.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = body.resource;
      const amount = parseFloat(resource.amount.value);
      const customId = resource.custom_id; // Pass userId here when creating order
      const userId = customId as any;

      await ctx.runMutation(internal.payments.processPayment, {
        userId,
        amount,
        provider: "paypal",
        transactionId: resource.id,
      });
    }
    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/api/payments/skrill",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const formData = await request.formData();
    const transaction_id = formData.get("transaction_id") as string;
    const mb_amount = formData.get("mb_amount") as string;
    const status = formData.get("status") as string;
    const userIdStr = formData.get("field1") as string; // We'll pass userId in field1

    if (status === "2") { // 2 = Processed
      const userId = userIdStr as any;
      await ctx.runMutation(internal.payments.processPayment, {
        userId,
        amount: parseFloat(mb_amount),
        provider: "skrill",
        transactionId: transaction_id,
      });
    }
    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/api/payments/coinpayments",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const formData = await request.formData();
    const status = parseInt(formData.get("status") as string);
    const txn_id = formData.get("txn_id") as string;
    const amount1 = formData.get("amount1") as string; // original amount
    const userIdStr = formData.get("custom") as string;

    if (status >= 100 || status === 2) { // Completed
      const userId = userIdStr as any;
      await ctx.runMutation(internal.payments.processPayment, {
        userId,
        amount: parseFloat(amount1),
        provider: "coinpayments",
        transactionId: txn_id,
      });
    }
    return new Response("IPN OK", { status: 200 });
  }),
});

export default http;
