import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateCoupon = mutation({
  args: { 
    adminId: v.id("users"), 
    amount: v.number() 
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'owner')) {
      throw new Error("Unauthorized: Only admins can generate coupons");
    }

    // Generate a secure random code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'BS-';
    for (let i = 0; i < 12; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    await ctx.db.insert("coupons", {
      code,
      amount: args.amount,
      isUsed: false,
      createdBy: args.adminId,
    });

    return code;
  },
});

export const redeemCoupon = mutation({
  args: { 
    userId: v.id("users"), 
    code: v.string() 
  },
  returns: v.object({ amount: v.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase().trim()))
      .first();

    if (!coupon) throw new Error("Invalid coupon code");
    if (coupon.isUsed) throw new Error("Coupon has already been used");

    // Update coupon status
    await ctx.db.patch(coupon._id, {
      isUsed: true,
      usedBy: args.userId,
      usedAt: Date.now(),
    });

    // Update user balance
    await ctx.db.patch(args.userId, {
      balance: user.balance + coupon.amount,
    });

    // Log transaction
    await ctx.db.insert("transactions", {
      userId: args.userId,
      amount: coupon.amount,
      type: "deposit",
      status: "completed",
      method: "GIFT_CARD",
      details: `Redeemed code: ${coupon.code}`,
    });

    // Broadcast for Xbox Notification
    await ctx.db.insert("notifications", {
      type: "deposit",
      username: user.username,
      content: coupon.amount.toFixed(2),
    });

    return { amount: coupon.amount };
  },
});

export const listAllCoupons = query({
  args: { adminId: v.id("users") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'owner')) {
      return [];
    }
    return await ctx.db.query("coupons").order("desc").collect();
  },
});
