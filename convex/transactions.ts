import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Handle a deposit. 
 * If amount >= 100, add 40% bonus.
 */
export const deposit = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    method: v.string(), // "DEMO", "PAYPAL", etc.
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    let bonus = 0;
    if (args.amount >= 100) {
      bonus = args.amount * 0.4;
    }

    const totalToCredit = args.amount + bonus;
    const status = "pending";

    await ctx.db.insert("transactions", {
      userId: args.userId,
      type: "deposit",
      amount: args.amount,
      status: status,
      method: args.method,
      bonus: bonus > 0 ? bonus : undefined,
    });

    if (status === "completed") {
      await ctx.db.patch(args.userId, {
        balance: (user.balance || 0) + totalToCredit,
      });
      // Global broadcast for deposit
      await ctx.db.insert("notifications", {
        type: "deposit",
        username: user.username,
        content: args.amount.toString(),
      });
    }

    return null;
  },
});

/**
 * Request a withdrawal.
 */
export const requestWithdrawal = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    method: v.string(), // "LTC", "BTC", "ETH", "SKRILL"
    address: v.string(),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    if (user.balance < args.amount) {
      return { success: false, message: "Insufficient balance." };
    }

    // Deduct balance immediately
    await ctx.db.patch(args.userId, {
      balance: user.balance - args.amount,
    });

    await ctx.db.insert("transactions", {
      userId: args.userId,
      type: "withdrawal",
      amount: args.amount,
      status: "pending",
      method: args.method,
      details: args.address,
    });

    return { success: true, message: "Withdrawal request submitted." };
  },
});

/**
 * Admin: Approve/Complete a withdrawal or deposit.
 */
export const updateTransactionStatus = mutation({
  args: {
    transactionId: v.id("transactions"),
    status: v.union(v.literal("completed"), v.literal("rejected")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) throw new Error("Transaction not found");
    if (tx.status !== "pending") throw new Error("Transaction already processed");

    const user = await ctx.db.get(tx.userId);
    if (!user) throw new Error("User not found");

    if (args.status === "completed") {
      if (tx.type === "deposit") {
        const bonus = tx.bonus || 0;
        await ctx.db.patch(tx.userId, {
          balance: (user.balance || 0) + tx.amount + bonus,
        });
      }
      // For withdrawals, we already deducted the balance on request.
    } else if (args.status === "rejected") {
      if (tx.type === "withdrawal") {
        // Refund balance if withdrawal is rejected
        await ctx.db.patch(tx.userId, {
          balance: (user.balance || 0) + tx.amount,
        });
      }
    }

    await ctx.db.patch(args.transactionId, { status: args.status });
    return null;
  },
});

export const listMyTransactions = query({
  args: { userId: v.id("users") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const listAllPendingTransactions = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});
