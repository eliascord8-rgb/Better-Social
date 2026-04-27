import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("moderator"), v.literal("user")),
    balance: v.number(),
    level: v.number(),
    profilePicture: v.optional(v.string()),
    lastIp: v.optional(v.string()),
    isKicked: v.boolean(),
    apiKey: v.optional(v.string()),
    muteUntil: v.optional(v.number()),
  }).index("by_username", ["username"]).index("by_apiKey", ["apiKey"]),

  keys: defineTable({
    key: v.string(),
    isUsed: v.boolean(),
    assignedTo: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  orders: defineTable({
    userId: v.id("users"),
    serviceId: v.string(),
    quantity: v.number(),
    targetUrl: v.string(),
    status: v.string(),
    cost: v.number(),
    apiResponse: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    userId: v.optional(v.id("users")),
    username: v.string(),
    role: v.string(),
    level: v.optional(v.number()),
    content: v.string(),
    channel: v.string(),
  }).index("by_channel", ["channel"]),

  notifications: defineTable({
    type: v.union(v.literal("login"), v.literal("alert"), v.literal("deposit"), v.literal("order"), v.literal("chat")),
    userId: v.optional(v.id("users")),
    username: v.optional(v.string()),
    level: v.optional(v.number()),
    content: v.optional(v.string()),
  }),

  smmConfig: defineTable({
    apiUrl: v.string(),
    apiKey: v.string(),
    isActive: v.boolean(),
    markupPercentage: v.optional(v.number()),
  }),

  supportThreads: defineTable({
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("closed")),
    lastMessageTime: v.number(),
    assignedTo: v.optional(v.id("users")),
  }).index("by_user", ["userId"]),

  supportMessages: defineTable({
    threadId: v.id("supportThreads"),
    senderId: v.optional(v.id("users")),
    senderName: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("agent")),
    content: v.string(),
  }).index("by_thread", ["threadId"]),

  transactions: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("deposit"), v.literal("withdrawal")),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("rejected")),
    method: v.string(),
    details: v.optional(v.string()),
    bonus: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  coupons: defineTable({
    code: v.string(),
    amount: v.number(),
    isUsed: v.boolean(),
    usedBy: v.optional(v.id("users")),
    usedAt: v.optional(v.number()),
    createdBy: v.id("users"),
  }).index("by_code", ["code"]),

  services: defineTable({
    externalId: v.string(),
    name: v.string(),
    category: v.string(),
    rate: v.number(),
    customRate: v.optional(v.number()),
    isVisible: v.boolean(),
    min: v.number(),
    max: v.number(),
    type: v.string(),
  })
    .index("by_externalId", ["externalId"])
    .index("by_category", ["category"])
    .index("by_isVisible", ["isVisible"]),

  paymentConfigs: defineTable({
    provider: v.union(v.literal("paypal"), v.literal("payeer"), v.literal("coinpayments"), v.literal("stripe"), v.literal("skrill")),
    config: v.record(v.string(), v.string()),
    isActive: v.boolean(),
  }).index("by_provider", ["provider"]),
});
