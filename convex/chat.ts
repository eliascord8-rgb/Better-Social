import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const send = mutation({
  args: {
    userId: v.id("users"),
    username: v.string(),
    role: v.string(),
    level: v.number(),
    content: v.string(),
    channel: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Check if muted
    if (user.muteUntil && user.muteUntil > Date.now()) {
      throw new Error(`Muted until: ${new Date(user.muteUntil).toLocaleTimeString()}`);
    }

    // Check for Commands (Admin/Owner/Mod only)
    if (args.content.startsWith("/") && (user.role === 'admin' || user.role === 'owner' || user.role === 'moderator')) {
      const parts = args.content.split(" ");
      const cmd = parts[0].toLowerCase();

      if (cmd === "/mute" && parts.length >= 3) {
        const targetUsername = parts[1];
        const durationStr = parts[2].toLowerCase();
        let durationMs = parseInt(durationStr) * 60 * 1000; // Default to minutes

        if (durationStr.includes("h")) durationMs = parseInt(durationStr) * 60 * 60 * 1000;
        else if (durationStr.includes("s")) durationMs = parseInt(durationStr) * 1000;
        else if (durationStr.includes("d")) durationMs = parseInt(durationStr) * 24 * 60 * 60 * 1000;

        const targetUser = await ctx.db
          .query("users")
          .withIndex("by_username", (q) => q.eq("username", targetUsername))
          .first();

        if (targetUser) {
          await ctx.db.patch(targetUser._id, { muteUntil: Date.now() + durationMs });
          
          await ctx.db.insert("messages", {
            username: "SYSTEM",
            role: "admin",
            content: `${targetUsername} has been muted for ${durationStr}`,
            channel: args.channel,
            level: 99
          });
          return null;
        }
      }

      if (cmd === "/tip" && parts.length >= 3) {
        const targetHandle = parts[1]; // @username or username
        const targetUsername = targetHandle.startsWith("@") ? targetHandle.substring(1) : targetHandle;
        const amount = parseFloat(parts[2]);

        if (isNaN(amount) || amount <= 0) {
          throw new Error("Invalid tip amount");
        }

        if (user.balance < amount) {
          throw new Error("Insufficient balance to tip");
        }

        const targetUser = await ctx.db
          .query("users")
          .withIndex("by_username", (q) => q.eq("username", targetUsername))
          .first();

        if (!targetUser) {
          throw new Error("User not found");
        }

        if (targetUser._id === user._id) {
          throw new Error("You cannot tip yourself");
        }

        // Deduct from sender
        await ctx.db.patch(user._id, { balance: user.balance - amount });
        // Add to receiver
        await ctx.db.patch(targetUser._id, { balance: targetUser.balance + amount });

        // Announcement
        await ctx.db.insert("messages", {
          username: "SYSTEM",
          role: "admin",
          content: `${user.username} tipped €${amount.toFixed(2)} to ${targetUser.username}! 💸`,
          channel: args.channel,
          level: 99
        });

        // Add transaction records for both
        await ctx.db.insert("transactions", {
          userId: user._id,
          amount: -amount,
          type: "tip_sent",
          description: `Tipped ${targetUser.username}`,
          status: "completed"
        });

        await ctx.db.insert("transactions", {
          userId: targetUser._id,
          amount: amount,
          type: "tip_received",
          description: `Received tip from ${user.username}`,
          status: "completed"
        });

        return null;
      }
    }

    // Regular tip command for everyone (not just admin)
    if (args.content.startsWith("/tip ")) {
      const parts = args.content.split(" ");
      if (parts.length >= 3) {
        const targetHandle = parts[1];
        const targetUsername = targetHandle.startsWith("@") ? targetHandle.substring(1) : targetHandle;
        const amount = parseFloat(parts[2]);

        if (!isNaN(amount) && amount > 0) {
          if (user.balance < amount) {
            throw new Error("Insufficient balance to tip");
          }

          const targetUser = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", targetUsername))
            .first();

          if (targetUser) {
            if (targetUser._id === user._id) {
              throw new Error("You cannot tip yourself");
            }
            
            await ctx.db.patch(user._id, { balance: user.balance - amount });
            await ctx.db.patch(targetUser._id, { balance: targetUser.balance + amount });

            await ctx.db.insert("messages", {
              username: "SYSTEM",
              role: "admin",
              content: `${user.username} tipped €${amount.toFixed(2)} to ${targetUser.username}! 💸`,
              channel: args.channel,
              level: 99
            });

            await ctx.db.insert("transactions", {
              userId: user._id,
              amount: -amount,
              type: "tip_sent",
              description: `Tipped ${targetUser.username}`,
              status: "completed"
            });

            await ctx.db.insert("transactions", {
              userId: targetUser._id,
              amount: amount,
              type: "tip_received",
              description: `Received tip from ${user.username}`,
              status: "completed"
            });

            return null;
          }
        }
      }
    }

    // Insert regular message
    await ctx.db.insert("messages", {
      userId: args.userId,
      username: args.username,
      role: args.role,
      level: args.level,
      content: args.content,
      channel: args.channel,
    });

    // Notify Owners/Admins via Global Broadcaster for community chat
    if (args.channel === "community") {
      await ctx.db.insert("notifications", {
        type: "chat",
        username: args.username,
        content: args.content,
        level: args.level,
      });
    }

    // Bot logic
    if (!args.username.toLowerCase().includes("bot") && !args.content.startsWith("/")) {
      await ctx.scheduler.runAfter(1000, internal.chat.nexusBotResponse, {
        channel: args.channel,
        triggerMessage: args.content,
      });
    }

    return null;
  },
});

export const nexusBotResponse = internalMutation({
  args: { channel: v.string(), triggerMessage: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const responses = [
      "I'm monitoring the systems. Everything looks optimal.",
      "Need assistance with an order? Contact our elite support.",
      "Better Quality is the #1 provider in the market.",
      "Processing data... Your request is being handled.",
      "Welcome to the inner circle.",
      "Stay secure, stay anonymous.",
    ];
    
    let responseText = responses[Math.floor(Math.random() * responses.length)];
    
    if (args.triggerMessage.toLowerCase().includes("help")) {
      responseText = "Type 'New Order' to see our services or contact a moderator for billing issues.";
    }

    await ctx.db.insert("messages", {
      userId: undefined,
      username: "BetterQualityBot",
      role: "admin",
      content: responseText,
      channel: args.channel,
      level: 99
    });
    return null;
  },
});

export const list = query({
  args: { channel: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channel", args.channel))
      .order("desc")
      .take(50);
  },
});

export const getLatestGlobalNotification = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db
      .query("notifications")
      .filter((q) => q.or(
        q.eq(q.field("type"), "login"),
        q.eq(q.field("type"), "deposit"),
        q.eq(q.field("type"), "order"),
        q.eq(q.field("type"), "chat")
      ))
      .order("desc")
      .first();
  },
});

export const getMyAlerts = query({
  args: { userId: v.id("users") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .filter((q) => q.and(
        q.eq(q.field("type"), "alert"),
        q.eq(q.field("userId"), args.userId)
      ))
      .collect();
  },
});
