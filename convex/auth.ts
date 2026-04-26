import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const register = mutation({
  args: {
    username: v.string(),
    email: v.optional(v.string()),
    password: v.string(),
  },
  returns: v.object({ success: v.boolean(), message: v.string(), userId: v.optional(v.id("users")) }),
  handler: async (ctx, args) => {
    console.log(`Registering user: ${args.username}`);
    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existing) {
      return { success: false, message: "Username already taken." };
    }

    // Create user
    const userId = await ctx.db.insert("users", {
      username: args.username,
      email: args.email,
      password: args.password,
      role: args.username.toLowerCase() === "admin" ? "admin" : "user", 
      balance: 0, 
      level: 0,
      isKicked: false,
      lastIp: "127.0.0.1",
    });

    // Create login notification
    await ctx.db.insert("notifications", {
      type: "login",
      userId,
      username: args.username,
      level: 0,
    });

    return { success: true, message: "Registered successfully.", userId };
  },
});

export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  returns: v.object({ success: v.boolean(), message: v.string(), user: v.optional(v.any()) }),
  handler: async (ctx, args) => {
    console.log(`Login attempt for: ${args.username}`);
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) {
      return { success: false, message: "User not found." };
    }

    if (user.password !== args.password) {
      return { success: false, message: "Invalid password." };
    }

    if (user.isKicked) {
      return { success: false, message: "You have been kicked from the site." };
    }

    // Update notification for login
    await ctx.db.insert("notifications", {
      type: "login",
      userId: user._id,
      username: user.username,
      level: user.level,
    });

    return { success: true, message: "Logged in.", user };
  },
});

// Deprecated key generator
export const generateTestKey = mutation({
  args: { key: v.string() },
  returns: v.id("keys"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("keys", {
      key: args.key,
      isUsed: false,
    });
  },
});
