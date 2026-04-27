import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const getConfig = query({
  args: {},
  returns: v.union(v.null(), v.object({ 
    _id: v.id("smmConfig"), 
    _creationTime: v.number(), 
    apiUrl: v.string(), 
    apiKey: v.string(), 
    isActive: v.boolean(),
    markupPercentage: v.optional(v.number())
  })),
  handler: async (ctx) => {
    return await ctx.db.query("smmConfig").first();
  },
});

export const setConfig = mutation({
  args: { 
    apiUrl: v.string(), 
    apiKey: v.string(),
    markupPercentage: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("smmConfig").first();
    if (existing) {
      await ctx.db.patch(existing._id, { 
        apiUrl: args.apiUrl, 
        apiKey: args.apiKey, 
        isActive: true,
        markupPercentage: args.markupPercentage
      });
    } else {
      await ctx.db.insert("smmConfig", { 
        apiUrl: args.apiUrl, 
        apiKey: args.apiKey, 
        isActive: true,
        markupPercentage: args.markupPercentage
      });
    }
    return null;
  },
});

export const getCategories = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();
    const categories = new Set<string>();
    services.forEach(s => categories.add(s.category));
    return Array.from(categories).sort();
  },
});

export const getServicesByCategory = query({
  args: { category: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const config = await ctx.db.query("smmConfig").first();
    const markup = (config?.markupPercentage || 0) / 100;

    const services = await ctx.db
      .query("services")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
    
    return services.map(s => ({
      ...s,
      rate: s.rate * (1 + markup)
    }));
  },
});

export const getServices = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const config = await ctx.db.query("smmConfig").first();
    const markup = (config?.markupPercentage || 0) / 100;

    // Return only the first 1000 to avoid the 8192 limit
    const services = await ctx.db.query("services").take(1000);
    if (services.length > 0) {
      return services.map(s => ({
        ...s,
        rate: s.rate * (1 + markup)
      }));
    }
    
    // Fallback for UI if empty
    return [
      { _id: "mock1", externalId: "1", name: "Instagram Followers [Real]", rate: 2.50 * (1 + markup), category: "Instagram" },
      { _id: "mock2", externalId: "2", name: "TikTok Views [Instant]", rate: 0.10 * (1 + markup), category: "TikTok" },
      { _id: "mock3", externalId: "3", name: "YouTube Subscribers [No Drop]", rate: 15.00 * (1 + markup), category: "YouTube" },
    ];
  },
});

export const syncServices = action({
  args: {},
  returns: v.object({ success: v.boolean(), count: v.number(), error: v.optional(v.string()) }),
  handler: async (ctx): Promise<{ success: boolean; count: number; error?: string }> => {
    const config: any = await ctx.runQuery(api.smm.getConfig);
    
    if (!config || !config.apiKey || !config.apiUrl) {
      return { success: false, count: 0, error: "SMM Config incomplete" };
    }

    try {
      const apiUrl = config.apiUrl.trim();
      const apiKey = config.apiKey.trim();
      const separator = apiUrl.includes('?') ? '&' : '?';
      const fullUrl = `${apiUrl}${separator}key=${apiKey}&action=services`;
      
      const response = await fetch(fullUrl);
      if (!response.ok) return { success: false, count: 0, error: `HTTP Error: ${response.status}` };

      const data: any = await response.json();
      if (!Array.isArray(data)) return { success: false, count: 0, error: "Invalid response format" };

      // Clear existing services first
      await ctx.runMutation(internal.smm.clearServices);

      // Chunk the updates to stay within Convex argument limits (8192 items)
      // We'll use smaller chunks (1000) for safety and performance
      const chunkSize = 1000;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await ctx.runMutation(internal.smm.appendServicesBatch, { services: chunk });
      }

      return { success: true, count: data.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message };
    }
  },
});

export const clearServices = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const existing = await ctx.db.query("services").collect();
    for (const s of existing) {
      await ctx.db.delete(s._id);
    }
    return null;
  },
});

export const appendServicesBatch = internalMutation({
  args: { services: v.array(v.any()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const s of args.services) {
      try {
        await ctx.db.insert("services", {
          externalId: (s.service || s.id || "").toString(),
          name: s.name || "Unnamed Service",
          category: s.category || "General",
          rate: parseFloat(s.rate || "0"),
          min: parseInt(s.min || "0"),
          max: parseInt(s.max || "0"),
          type: s.type || "Default",
        });
      } catch (e) {
        // Silently skip failed individual inserts to not break the whole sync
      }
    }
    return null;
  },
});

export const placeOrder = mutation({
  args: {
    userId: v.id("users"),
    serviceId: v.string(),
    quantity: v.number(),
    targetUrl: v.string(),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const service = await ctx.db.query("services").withIndex("by_externalId", q => q.eq("externalId", args.serviceId)).unique();
    if (!service) throw new Error("Service not found");

    const config = await ctx.db.query("smmConfig").first();
    const markup = (config?.markupPercentage || 0) / 100;
    const finalRate = service.rate * (1 + markup);
    const cost = (finalRate / 1000) * args.quantity;

    if (user.balance < cost) throw new Error("Insufficient balance");

    // Deduct balance
    await ctx.db.patch(args.userId, { balance: user.balance - cost });

    // Insert order locally
    const orderId = await ctx.db.insert("orders", {
      userId: args.userId,
      serviceId: args.serviceId,
      quantity: args.quantity,
      targetUrl: args.targetUrl,
      status: "pending",
      cost: cost,
    });

    // Schedule the actual API call
    await ctx.scheduler.runAfter(0, api.smm.forwardOrderToApi, { orderId });

    // Global broadcast for order
    await ctx.db.insert("notifications", {
      type: "order",
      username: user.username,
      content: args.quantity.toString(),
    });

    return orderId;
  },
});

export const forwardOrderToApi = action({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const order: any = await ctx.runQuery(internal.smm.getOrderInternal, { orderId: args.orderId });
    if (!order) return null;

    const config: any = await ctx.runQuery(api.smm.getConfig);
    if (!config || !config.apiKey) {
      await ctx.runMutation(internal.smm.updateOrderStatus, { orderId: args.orderId, status: "failed", response: "SMM Config missing" });
      return null;
    }

    try {
      const url = `${config.apiUrl}?key=${config.apiKey}&action=add&service=${order.serviceId}&link=${encodeURIComponent(order.targetUrl)}&quantity=${order.quantity}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.order) {
        await ctx.runMutation(internal.smm.updateOrderStatus, { orderId: args.orderId, status: "processing", response: JSON.stringify(data) });
      } else {
        await ctx.runMutation(internal.smm.updateOrderStatus, { orderId: args.orderId, status: "failed", response: JSON.stringify(data) });
      }
    } catch (err: any) {
      await ctx.runMutation(internal.smm.updateOrderStatus, { orderId: args.orderId, status: "failed", response: err.message });
    }
    return null;
  },
});

export const getOrderInternal = internalQuery({
  args: { orderId: v.id("orders") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId);
  },
});

export const updateOrderStatus = internalMutation({
  args: { orderId: v.id("orders"), status: v.string(), response: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { status: args.status, apiResponse: args.response });
    return null;
  },
});
