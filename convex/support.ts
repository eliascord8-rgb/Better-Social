import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const getOrCreateThread = mutation({
  args: { 
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()) 
  },
  returns: v.id("supportThreads"),
  handler: async (ctx, args) => {
    if (args.userId) {
      const existing = await ctx.db
        .query("supportThreads")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter(q => q.eq(q.field("status"), "active"))
        .first();
      if (existing) return existing._id;
    }

    return await ctx.db.insert("supportThreads", {
      userId: args.userId,
      email: args.email,
      status: "active",
      lastMessageTime: Date.now(),
    });
  },
});

export const sendMessage = mutation({
  args: {
    threadId: v.id("supportThreads"),
    senderId: v.optional(v.id("users")),
    senderName: v.string(),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("agent")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("supportMessages", {
      threadId: args.threadId,
      senderId: args.senderId,
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
    
    // Explicitly cast to Id<"supportThreads"> to satisfy TypeScript
    const threadId = args.threadId as Id<"supportThreads">;
    
    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();

    const results = [];
    for (const msg of messages) {
      let profilePicture = undefined;
      if (msg.senderId) {
        const user = await ctx.db.get(msg.senderId);
        profilePicture = user?.profilePicture;
      }
      results.push({ ...msg, profilePicture });
    }
    return results;
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
      const lastMsg = await ctx.db
        .query("supportMessages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .order("desc")
        .first();

      let username = thread.email || "Guest";
      if (thread.userId) {
        const user = await ctx.db.get(thread.userId);
        username = user?.username || username;
      }

      results.push({
        ...thread,
        username,
        lastMessage: lastMsg?.content || "No messages",
        lastMessageTime: lastMsg?._creationTime || thread.lastMessageTime,
      });
    }
    return results;
  },
});

export const joinThread = mutation({
  args: { threadId: v.id("supportThreads"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Staff user not found");

    await ctx.db.patch(args.threadId, { assignedTo: args.userId });

    // System message
    await ctx.db.insert("supportMessages", {
      threadId: args.threadId,
      senderName: "System",
      content: `${user.username} (${user.role}) joined the conversation.`,
      role: "admin",
    });

    return null;
  },
});

export const transferThread = mutation({
  args: { 
    threadId: v.id("supportThreads"), 
    fromUserId: v.id("users"), 
    toUserId: v.id("users") 
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const toUser = await ctx.db.get(args.toUserId);
    const fromUser = await ctx.db.get(args.fromUserId);
    if (!toUser) throw new Error("Target staff not found");

    await ctx.db.patch(args.threadId, { assignedTo: args.toUserId });

    await ctx.db.insert("supportMessages", {
      threadId: args.threadId,
      senderName: "System",
      content: `Conversation transferred from ${fromUser?.username} to ${toUser.username}.`,
      role: "admin",
    });

    return null;
  },
});

export const getThreadDetails = query({
  args: { threadId: v.optional(v.id("supportThreads")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (!args.threadId) return null;
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;

    let operatorName = null;
    let operatorPicture = null;
    if (thread.assignedTo) {
      const op = await ctx.db.get(thread.assignedTo);
      operatorName = op?.username;
      operatorPicture = op?.profilePicture;
    }

    return { ...thread, operatorName, operatorPicture };
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
