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
  args: { apiUrl: v.string(), apiKey: v.string(), markupPercentage: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("smmConfig").first();
    if (existing) {
      await ctx.db.patch(existing._id, { apiUrl: args.apiUrl, apiKey: args.apiKey, isActive: true, markupPercentage: args.markupPercentage });
    } else {
      await ctx.db.insert("smmConfig", { apiUrl: args.apiUrl, apiKey: args.apiKey, isActive: true, markupPercentage: args.markupPercentage });
    }
    return null;
  },
});

export const getServices = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const config = await ctx.db.query("smmConfig").first();
    const markup = (config?.markupPercentage || 0) / 100;
    const services = await ctx.db.query("services").filter(q => q.eq(q.field("isVisible"), true)).collect();
    return services.map(s => ({ ...s, rate: s.customRate ?? (s.rate * (1 + markup)) }));
  },
});

export const listAllServices = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("services").collect();
  },
});

export const updateServiceSettings = mutation({
  args: { serviceId: v.id("services"), customRate: v.optional(v.number()), isVisible: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.serviceId, { customRate: args.customRate, isVisible: args.isVisible });
    return null;
  },
});

export const syncServices = action({
  args: {},
  returns: v.object({ success: v.boolean(), count: v.number(), error: v.optional(v.string()) }),
  handler: async (ctx): Promise<{ success: boolean; count: number; error?: string }> => {
    const config: any = await ctx.runQuery(api.smm.getConfig);
    if (!config || !config.apiKey || !config.apiUrl) return { success: false, count: 0, error: "SMM Config incomplete" };
    try {
      const response = await fetch(`${config.apiUrl}${config.apiUrl.includes('?') ? '&' : '?'}key=${config.apiKey}&action=services`);
      const data: any = await response.json();
      if (!Array.isArray(data)) return { success: false, count: 0, error: "Invalid response format" };
      const chunkSize = 100;
      for (let i = 0; i < data.length; i += chunkSize) {
        await ctx.runMutation(internal.smm.syncServicesBatch, { services: data.slice(i, i + chunkSize) });
      }
      return { success: true, count: data.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message };
    }
  },
});

export const syncServicesBatch = internalMutation({
  args: { services: v.array(v.any()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const s of args.services) {
      const externalId = (s.service || s.id || "").toString();
      const existing = await ctx.db.query("services").withIndex("by_externalId", (q) => q.eq("externalId", externalId)).unique();
      const serviceData = { externalId, name: s.name || "Unnamed Service", category: s.category || "General", rate: parseFloat(s.rate || "0"), min: parseInt(s.min || "0"), max: parseInt(s.max || "0"), type: s.type || "Default" };
      if (existing) await ctx.db.patch(existing._id, serviceData);
      else await ctx.db.insert("services", { ...serviceData, isVisible: false });
    }
    return null;
  },
});

export const placeOrder = mutation({
  args: { userId: v.id("users"), serviceId: v.string(), quantity: v.number(), targetUrl: v.string() },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const service = await ctx.db.query("services").withIndex("by_externalId", q => q.eq("externalId", args.serviceId)).unique();
    if (!user || !service) throw new Error("Not found");
    const config = await ctx.db.query("smmConfig").first();
    const finalRate = service.customRate ?? (service.rate * (1 + (config?.markupPercentage || 0) / 100));
    const cost = (finalRate / 1000) * args.quantity;
    if (user.balance < cost) throw new Error("Insufficient balance");
    await ctx.db.patch(args.userId, { balance: user.balance - cost });
    const orderId = await ctx.db.insert("orders", { userId: args.userId, serviceId: args.serviceId, quantity: args.quantity, targetUrl: args.targetUrl, status: "pending", cost });
    await ctx.scheduler.runAfter(0, api.smm.forwardOrderToApi, { orderId });
    return orderId;
  },
});

export const forwardOrderToApi = action({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const order: any = await ctx.runQuery(internal.smm.getOrderInternal, { orderId: args.orderId });
    const config: any = await ctx.runQuery(api.smm.getConfig);
    if (!order || !config) return null;
    try {
      const response = await fetch(`${config.apiUrl}?key=${config.apiKey}&action=add&service=${order.serviceId}&link=${encodeURIComponent(order.targetUrl)}&quantity=${order.quantity}`);
      const data = await response.json();
      await ctx.runMutation(internal.smm.updateOrderStatus, { orderId: args.orderId, status: data.order ? "processing" : "failed", response: JSON.stringify(data) });
    } catch (err: any) {
      await ctx.runMutation(internal.smm.updateOrderStatus, { orderId: args.orderId, status: "failed", response: err.message });
    }
    return null;
  },
});

export const getOrderInternal = internalQuery({ args: { orderId: v.id("orders") }, returns: v.any(), handler: async (ctx, args) => await ctx.db.get(args.orderId) });
export const updateOrderStatus = internalMutation({ args: { orderId: v.id("orders"), status: v.string(), response: v.string() }, returns: v.null(), handler: async (ctx, args) => { await ctx.db.patch(args.orderId, { status: args.status, apiResponse: args.response }); return null; } });
