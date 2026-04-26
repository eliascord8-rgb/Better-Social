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
