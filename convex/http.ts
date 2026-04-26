import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

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
        const selectedService = services.find((s: any) => s.id === service);

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
          cost: cost,
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

export default http;
