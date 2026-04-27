import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all active payment configurations.
 */
export const getActiveConfigs = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("paymentConfigs"),
    provider: v.string(),
    isActive: v.boolean(),
  })),
  handler: async (ctx) => {
    const configs = await ctx.db
      .query("paymentConfigs")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    return configs.map(c => ({
      _id: c._id,
      provider: c.provider,
      isActive: c.isActive,
    }));
  },
});

/**
 * Get full config for admin.
 */
export const getAdminConfigs = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("paymentConfigs").collect();
  },
});

/**
 * Update or create a payment configuration.
 */
export const saveConfig = mutation({
  args: {
    provider: v.union(v.literal("paypal"), v.literal("payeer"), v.literal("coinpayments"), v.literal("stripe"), v.literal("skrill")),
    config: v.record(v.string(), v.string()),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("paymentConfigs")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider as any))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        config: args.config,
        isActive: args.isActive,
      });
    } else {
      await ctx.db.insert("paymentConfigs", {
        provider: args.provider as any,
        config: args.config,
        isActive: args.isActive,
      });
    }
    return null;
  },
});

/**
 * Internal mutation to process a payment from an IPN.
 */
export const processPayment = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    provider: v.string(),
    transactionId: v.string(), // External transaction ID
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Check if transaction already exists
    const existingTx = await ctx.db
      .query("transactions")
      .filter((q) => q.and(
        q.eq(q.field("method"), args.provider),
        q.eq(q.field("details"), args.transactionId)
      ))
      .unique();

    if (existingTx) return null;

    let bonus = 0;
    if (args.amount >= 100) {
      bonus = args.amount * 0.4;
    }

    await ctx.db.insert("transactions", {
      userId: args.userId,
      type: "deposit",
      amount: args.amount,
      status: "completed",
      method: args.provider,
      details: args.transactionId,
      bonus: bonus > 0 ? bonus : undefined,
    });

    await ctx.db.patch(args.userId, {
      balance: user.balance + args.amount + bonus,
    });

    await ctx.db.insert("notifications", {
      type: "deposit",
      username: user.username,
      content: args.amount.toString(),
    });

    return null;
  },
});
