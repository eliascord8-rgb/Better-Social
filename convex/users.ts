import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const listWithEmails = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.filter(u => u.email);
  },
});

export const addBalance = mutation({
  args: { userId: v.id("users"), amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(args.userId, { balance: user.balance + args.amount });
    return null;
  },
});

export const kickUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { isKicked: true });
    // Push a "You have been kicked" alert to the user's specific notification stream
    await ctx.db.insert("notifications", {
      type: "alert",
      userId: args.userId,
      content: "You have been kicked from the site.",
    });
    return null;
  },
});

export const sendUserAlert = mutation({
  args: { userId: v.id("users"), message: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      type: "alert",
      userId: args.userId,
      content: args.message,
    });
    return null;
  },
});

export const getMe = query({
  args: { userId: v.optional(v.id("users")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    return await ctx.db.get(args.userId);
  },
});

export const generateApiKey = mutation({
  args: { userId: v.id("users") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    
    const newApiKey = `nx_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    await ctx.db.patch(args.userId, { apiKey: newApiKey });
    return newApiKey;
  },
});

export const setUserRole = mutation({
  args: { 
    username: v.string(), 
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("moderator"), v.literal("user")) 
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (!user) return "User not found";
    await ctx.db.patch(user._id, { role: args.role });
    return `User ${args.username} updated to role: ${args.role}.`;
  },
});

export const updateUserPassword = mutation({
  args: { userId: v.id("users"), newPassword: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { password: args.newPassword });
    return null;
  },
});

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    profilePicture: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.profilePicture !== undefined) patch.profilePicture = args.profilePicture;
    if (args.password !== undefined) patch.password = args.password;
    
    await ctx.db.patch(args.userId, patch);
    return null;
  },
});

export const tip = mutation({
  args: {
    senderId: v.id("users"),
    receiverUsername: v.string(),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sender = await ctx.db.get(args.senderId);
    if (!sender) throw new Error("Sender not found");

    if (sender.balance < args.amount) {
      throw new Error("Insufficient balance");
    }

    const receiver = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.receiverUsername))
      .first();
    
    if (!receiver) throw new Error("Receiver not found");
    if (receiver._id === sender._id) throw new Error("Cannot tip yourself");

    await ctx.db.patch(sender._id, { balance: sender.balance - args.amount });
    await ctx.db.patch(receiver._id, { balance: receiver.balance + args.amount });

    await ctx.db.insert("messages", {
      username: "SYSTEM",
      role: "admin",
      content: `${sender.username} tipped €${args.amount.toFixed(2)} to ${receiver.username}! 💸`,
      channel: "community",
      level: 99
    });

    await ctx.db.insert("transactions", {
      userId: sender._id,
      amount: -args.amount,
      type: "tip_sent",
      description: `Tipped ${receiver.username}`,
      status: "completed"
    });

    await ctx.db.insert("transactions", {
      userId: receiver._id,
      amount: args.amount,
      type: "tip_received",
      description: `Received tip from ${sender.username}`,
      status: "completed"
    });

    return null;
  },
});

export const getUserByApiKey = query({
  args: { apiKey: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", args.apiKey))
      .first();
  },
});
