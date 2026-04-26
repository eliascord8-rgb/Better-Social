import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreateThread = mutation({
  args: { 
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
  },
  returns: v.id("supportThreads"),
  handler: async (ctx, args) => {
    let existing;
    
    if (args.userId) {
      existing = await ctx.db
        .query("supportThreads")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();
    } else if (args.email) {
      existing = await ctx.db
        .query("supportThreads")
        .filter((q) => q.and(
          q.eq(q.field("email"), args.email),
          q.eq(q.field("status"), "active")
        ))
        .first();
    }

    if (existing) return existing._id;

    const threadId = await ctx.db.insert("supportThreads", {
      userId: args.userId,
      email: args.email,
      status: "active",
      lastMessageTime: Date.now(),
    });

    // Auto-reply from Agent
    await ctx.db.insert("supportMessages", {
      threadId,
      senderId: undefined,
      senderName: "BetterQualityBot",
      content: "Welcome to Better Quality Support. An agent will be with you shortly. How can we help you today?",
      role: "agent",
    });

    return threadId;
  },
});

export const sendMessage = mutation({
  args: {
    threadId: v.id("supportThreads"),
    senderId: v.optional(v.id("users")), // Optional for guest
    senderName: v.string(),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("agent")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("supportMessages", {
      threadId: args.threadId,
      senderId: args.senderId as any,
      senderName: args.senderName,
      content: args.content,
      role: args.role,
    });

    await ctx.db.patch(args.threadId, {
      lastMessageTime: Date.now(),
    });

    return null;
  },
});

export const getMessages = query({
  args: { threadId: v.optional(v.id("supportThreads")) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    if (!args.threadId) return [];
    return await ctx.db
      .query("supportMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId!))
      .collect();
  },
});

export const listActiveThreads = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const threads = await ctx.db
      .query("supportThreads")
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .collect();

    const results = [];
    for (const thread of threads) {
      let displayName = "Unknown";
      if (thread.userId) {
        const user = await ctx.db.get(thread.userId);
        displayName = user?.username || "Deleted User";
      } else if (thread.email) {
        displayName = `Guest (${thread.email})`;
      }

      const lastMessage = await ctx.db
        .query("supportMessages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .order("desc")
        .first();
      
      results.push({
        ...thread,
        username: displayName,
        lastMessage: lastMessage?.content || "No messages",
      });
    }
    return results;
  },
});

export const closeThread = mutation({
  args: { threadId: v.id("supportThreads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, { status: "closed" });
    return null;
  },
});
